import Imap from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { decrypt } from '../utils/encryption';

export interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: {
    rejectUnauthorized: boolean;
  };
}

export interface FetchedEmail {
  messageId: string;
  threadId?: string; // Gmail's native thread ID for conversation grouping
  from: { email: string; name: string };
  to: { email: string; name: string }[];
  cc?: { email: string; name: string }[];
  bcc?: { email: string; name: string }[];
  replyTo?: { email: string; name: string }[];
  subject: string;
  body: string;
  htmlBody?: string;
  date: Date;
  hasAttachments: boolean;
  isRead: boolean;
  uid: number | string;
  providerType?: string;
  // Unsubscribe info from List-Unsubscribe header
  unsubscribeUrl?: string | null;
  unsubscribeEmail?: string | null;
}

export class ImapService {
  private imap: Imap | null = null;

  constructor(private config: ImapConfig) {}

  /**
   * Connect to IMAP server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.imap = new Imap({
          user: this.config.user,
          password: this.config.password,
          host: this.config.host,
          port: this.config.port,
          tls: this.config.tls,
          tlsOptions: this.config.tlsOptions || { rejectUnauthorized: false },
          authTimeout: 10000,
          connTimeout: 10000
        });

        this.imap.once('ready', () => {
          console.log(`IMAP connected: ${this.config.user}@${this.config.host}`);
          resolve();
        });

        this.imap.once('error', (err: Error) => {
          console.error('IMAP connection error:', err);
          reject(err);
        });

        this.imap.once('end', () => {
          console.log('IMAP connection ended');
        });

        this.imap.connect();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from IMAP server
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.imap) {
        this.imap.end();
        this.imap = null;
      }
      resolve();
    });
  }

  /**
   * Fetch recent emails from INBOX
   */
  async fetchRecentEmails(limit: number = 50): Promise<FetchedEmail[]> {
    if (!this.imap) {
      throw new Error('IMAP not connected');
    }

    return new Promise((resolve, reject) => {
      this.imap!.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Fetch the most recent emails
        const total = box.messages.total;
        if (total === 0) {
          resolve([]);
          return;
        }

        const start = Math.max(1, total - limit + 1);
        const end = total;
        const range = `${start}:${end}`;

        const fetch = this.imap!.seq.fetch(range, {
          bodies: '',
          struct: true,
          markSeen: false
        });

        const emails: FetchedEmail[] = [];
        const promises: Promise<void>[] = [];

        fetch.on('message', (msg, seqno) => {
          const promise = new Promise<void>((resolveMsg) => {
            let uid: number = 0;
            let flags: string[] = [];

            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (err) {
                  console.error('Email parsing error:', err);
                  resolveMsg();
                  return;
                }

                try {
                  const email = this.parseParsedMail(parsed, uid, flags);
                  emails.push(email);
                } catch (error) {
                  console.error('Error processing email:', error);
                }
                resolveMsg();
              });
            });

            msg.once('attributes', (attrs: any) => {
              uid = attrs.uid;
              flags = attrs.flags || [];
            });

            msg.once('end', () => {
              // Message processed
            });
          });

          promises.push(promise);
        });

        fetch.once('error', (err: Error) => {
          console.error('Fetch error:', err);
          reject(err);
        });

        fetch.once('end', async () => {
          await Promise.all(promises);
          resolve(emails);
        });
      });
    });
  }

  /**
   * Fetch emails since a specific date
   */
  async fetchEmailsSince(sinceDate: Date, limit?: number): Promise<FetchedEmail[]> {
    if (!this.imap) {
      throw new Error('IMAP not connected');
    }

    return new Promise((resolve, reject) => {
      this.imap!.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Search for emails since date
        const searchCriteria = [['SINCE', sinceDate]];

        this.imap!.search(searchCriteria, (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            resolve([]);
            return;
          }

          // Apply limit if specified (take most recent emails)
          const limitedResults = limit && results.length > limit
            ? results.slice(-limit) // Take last N (most recent)
            : results;

          const fetch = this.imap!.fetch(limitedResults, {
            bodies: '',
            struct: true,
            markSeen: false
          });

          const emails: FetchedEmail[] = [];
          const promises: Promise<void>[] = [];

          fetch.on('message', (msg, seqno) => {
            const promise = new Promise<void>((resolveMsg) => {
              let uid: number = 0;
              let flags: string[] = [];

              msg.on('body', (stream) => {
                simpleParser(stream, (err, parsed) => {
                  if (err) {
                    console.error('Email parsing error:', err);
                    resolveMsg();
                    return;
                  }

                  try {
                    const email = this.parseParsedMail(parsed, uid, flags);
                    emails.push(email);
                  } catch (error) {
                    console.error('Error processing email:', error);
                  }
                  resolveMsg();
                });
              });

              msg.once('attributes', (attrs: any) => {
                uid = attrs.uid;
                flags = attrs.flags || [];
              });

              msg.once('end', () => {
                // Message processed
              });
            });

            promises.push(promise);
          });

          fetch.once('error', (err: Error) => {
            console.error('Fetch error:', err);
            reject(err);
          });

          fetch.once('end', async () => {
            await Promise.all(promises);
            resolve(emails);
          });
        });
      });
    });
  }

  /**
   * Mark email as read on IMAP server
   */
  async markAsRead(uid: number): Promise<void> {
    if (!this.imap) {
      throw new Error('IMAP not connected');
    }

    return new Promise((resolve, reject) => {
      this.imap!.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        this.imap!.addFlags(uid, ['\\Seen'], (err) => {
          if (err) {
            console.error('Error marking email as read:', err);
            reject(err);
          } else {
            console.log(`Marked email UID ${uid} as read`);
            resolve();
          }
        });
      });
    });
  }

  /**
   * Mark email as unread on IMAP server
   */
  async markAsUnread(uid: number): Promise<void> {
    if (!this.imap) {
      throw new Error('IMAP not connected');
    }

    return new Promise((resolve, reject) => {
      this.imap!.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        this.imap!.delFlags(uid, ['\\Seen'], (err) => {
          if (err) {
            console.error('Error marking email as unread:', err);
            reject(err);
          } else {
            console.log(`Marked email UID ${uid} as unread`);
            resolve();
          }
        });
      });
    });
  }

  /**
   * Test IMAP connection
   */
  static async testConnection(config: ImapConfig): Promise<boolean> {
    const service = new ImapService(config);
    try {
      await service.connect();
      await service.disconnect();
      return true;
    } catch (error) {
      console.error('IMAP test connection failed:', error);
      return false;
    }
  }

  /**
   * Parse mailparser's ParsedMail into our FetchedEmail format
   */
  private parseParsedMail(parsed: ParsedMail, uid: number, flags: string[]): FetchedEmail {
    const from = this.parseAddress(parsed.from);
    const to = this.parseAddressList(parsed.to);
    const cc = this.parseAddressList(parsed.cc);
    const bcc = this.parseAddressList(parsed.bcc);
    const replyTo = this.parseAddressList(parsed.replyTo);

    return {
      messageId: parsed.messageId || `${uid}`,
      from,
      to,
      cc,
      bcc,
      replyTo: replyTo.length > 0 ? replyTo : undefined,
      subject: parsed.subject || '(No Subject)',
      body: parsed.text || '',
      htmlBody: parsed.html || undefined,
      date: parsed.date || new Date(),
      hasAttachments: (parsed.attachments && parsed.attachments.length > 0) || false,
      isRead: flags.includes('\\Seen'),
      uid
    };
  }

  /**
   * Parse a single email address
   */
  private parseAddress(address: any): { email: string; name: string } {
    if (!address) {
      return { email: '', name: '' };
    }

    if (address.value && Array.isArray(address.value) && address.value.length > 0) {
      const addr = address.value[0];
      return {
        email: addr.address || '',
        name: addr.name || ''
      };
    }

    if (address.text) {
      return { email: address.text, name: '' };
    }

    return { email: '', name: '' };
  }

  /**
   * Parse a list of email addresses
   */
  private parseAddressList(addresses: any): { email: string; name: string }[] {
    if (!addresses) {
      return [];
    }

    if (addresses.value && Array.isArray(addresses.value)) {
      return addresses.value.map((addr: any) => ({
        email: addr.address || '',
        name: addr.name || ''
      }));
    }

    if (addresses.text) {
      return [{ email: addresses.text, name: '' }];
    }

    return [];
  }
}

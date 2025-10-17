/**
 * Parse a message text to find all mentions (@username)
 * @param text The message text to parse
 * @returns Array of mention matches
 */
export interface MentionMatch {
  username: string;
  startIndex: number;
  endIndex: number;
}

export function parseMentions(text: string): MentionMatch[] {
  const mentionRegex = /@([\w-]+)/g;
  const mentions: MentionMatch[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Check if a user is mentioned in a message
 * @param text The message text
 * @param username The username to check for
 * @returns Whether the user is mentioned
 */
export function isUserMentioned(text: string, username: string): boolean {
  const mentions = parseMentions(text);
  return mentions.some(
    (mention) => mention.username.toLowerCase() === username.toLowerCase()
  );
}

/**
 * Get all unique usernames mentioned in a message
 * @param text The message text
 * @returns Array of unique usernames
 */
export function getMentionedUsernames(text: string): string[] {
  const mentions = parseMentions(text);
  return [...new Set(mentions.map((mention) => mention.username))];
}

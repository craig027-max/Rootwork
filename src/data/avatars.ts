/** Emoji avatars a parent can assign to a student profile. */
export const AVATARS = ['🦊', '🦉', '🐢', '🦋', '🐙', '🦁', '🐼', '🦄', '🐲', '🦕'] as const;

export type Avatar = (typeof AVATARS)[number];

export const DEFAULT_AVATAR: Avatar = '🦊';

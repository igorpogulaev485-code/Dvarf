import type { User } from '../../shared/api/auth'

type ProfileAvatarProps = {
  user: Pick<User, 'avatar_url' | 'display_name' | 'email' | 'full_name'>
  size?: 'sm' | 'md'
}

function initialsFrom(user: ProfileAvatarProps['user']): string {
  const source = user.display_name || user.full_name || user.email || '?'
  const parts = source.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function ProfileAvatar({ user, size = 'md' }: ProfileAvatarProps) {
  const sizeClass = size === 'sm' ? 'profile-avatar--sm' : ''

  if (user.avatar_url) {
    return (
      <img
        className={`profile-avatar profile-avatar--image ${sizeClass}`.trim()}
        src={user.avatar_url}
        alt=""
        width={size === 'sm' ? 40 : 88}
        height={size === 'sm' ? 40 : 88}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div
      className={`profile-avatar profile-avatar--placeholder ${sizeClass}`.trim()}
      aria-hidden
    >
      {initialsFrom(user)}
    </div>
  )
}

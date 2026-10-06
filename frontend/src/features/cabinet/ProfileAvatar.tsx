import type { User } from '../../shared/api/auth'

type ProfileAvatarProps = {
  user: Pick<User, 'avatar_url' | 'display_name' | 'email' | 'full_name'>
}

function initialsFrom(user: ProfileAvatarProps['user']): string {
  const source = user.display_name || user.full_name || user.email || '?'
  const parts = source.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function ProfileAvatar({ user }: ProfileAvatarProps) {
  if (user.avatar_url) {
    return (
      <img
        className="profile-avatar profile-avatar--image"
        src={user.avatar_url}
        alt=""
        width={88}
        height={88}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div className="profile-avatar profile-avatar--placeholder" aria-hidden>
      {initialsFrom(user)}
    </div>
  )
}

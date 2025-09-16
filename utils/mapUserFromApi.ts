// utils/mapUserFromApi.ts
// Utility to map backend user API response to frontend user structure

// Safe string utilities
function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return '';
  }
}

function safeDateString(value: any): string {
  if (!value) return '';
  try {
    const str = safeString(value);
    if (str.length >= 10) {
      return str.substring(0, 10);
    }
    return str;
  } catch {
    return '';
  }
}

function safeYear(value: any): string {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.getFullYear().toString();
  } catch {
    return '';
  }
}

function safeArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  return [];
}

function safeNumber(value: any): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function mapUserFromApi(body: any) {
  // Add null/undefined checks to prevent errors
  if (!body) {
    throw new Error('User data is missing from API response');
  }

  if (!body._id) {
    throw new Error('User ID is missing from API response');
  }

  return {
    id: body._id,
    _id: body._id,
    name: safeString(body.name),
    email: safeString(body.email),
    avatar: safeString(body.profileImage),
    profileImage: safeString(body.profileImage),
    coverImage: safeString(body.coverImage),
    bio: safeString(body.bio || body.about?.summary),
    location: safeString(body.about?.location),
    website: safeString(body.about?.website),
    phone: safeString(body.about?.phone),
    headline: safeString(body.about?.headline),
    joinedDate: body.createAt ? safeYear(body.createAt) : new Date().getFullYear().toString(),
    education: safeArray(body.education || body.about?.education).map((e: any) => ({
      id: safeString(e._id || e.id),
      institution: safeString(e.institution || e.school || e.name),
      name: safeString(e.institution || e.school || e.name),
      degree: safeString(e.degree),
      field: safeString(e.field || e.fos),
      startYear: safeString(e.startYear || e.startDate),
      endYear: safeString(e.endYear || e.endDate),
      current: Boolean(e.current),
      startDate: safeDateString(e.startDate),
      endDate: safeDateString(e.endDate)
    })),
    experience: safeArray(body.experience || body.about?.experience).map((e: any) => ({
      id: safeString(e._id || e.id),
      company: safeString(e.company || e.name),
      position: safeString(e.position || e.role),
      role: safeString(e.position || e.role),
      startDate: safeString(e.startDate),
      startYear: safeYear(e.startDate),
      endDate: safeString(e.endDate),
      endYear: safeYear(e.endDate),
      current: Boolean(e.current),
      description: safeString(e.description || e.desc),
    })),
    skills: safeArray(body.about?.skills),
    followers: Array.isArray(body.followers) ? body.followers.length : safeNumber(body.followers),
    following: Array.isArray(body.following) ? body.following.length : safeNumber(body.following),
    profileViews: safeNumber(body.profileViews),
    socialLinks: [],
    isFollowing: false,
    isVerified: Boolean(body.isVerified),
    // Additional safe fields
    streak: safeNumber(body.streak),
    lastStoryDate: safeString(body.lastStoryDate),
    token: safeString(body.token)
  };
}

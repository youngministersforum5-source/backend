import { query } from "../config/database";

export async function getDashboardStatistics() {
  const [totalResult, pendingResult, approvedResult, rejectedResult, subscribersResult, recentResult] =
    await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM members`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM members WHERE status = 'pending'`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM members WHERE status = 'approved'`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM members WHERE status = 'rejected'`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM subscribers`),
      query(
        `SELECT id, full_name, email, location, status, created_at
         FROM members
         ORDER BY created_at DESC
         LIMIT 10`
      ),
    ]);

  const recentRegistrations = recentResult.rows.map((row: any) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
  }));

  return {
    statistics: {
      totalMembers: parseInt(totalResult.rows[0].count, 10),
      pendingMembers: parseInt(pendingResult.rows[0].count, 10),
      approvedMembers: parseInt(approvedResult.rows[0].count, 10),
      rejectedMembers: parseInt(rejectedResult.rows[0].count, 10),
      totalSubscribers: parseInt(subscribersResult.rows[0].count, 10),
    },
    recentRegistrations,
  };
}

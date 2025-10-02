import './globals.css'
import { AdminShell } from './components/AdminShell'
import { getAdminRole } from '../lib/adminRole'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await getAdminRole()
  return (
    <html lang="en">
      <body data-admin-role={role}>
        <AdminShell role={role}>{children}</AdminShell>
      </body>
    </html>
  )
}

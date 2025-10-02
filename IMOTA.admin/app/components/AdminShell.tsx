'use client'
import React from 'react'
import Link from 'next/link'

export function AdminShell({ children, role }: { children: React.ReactNode, role: 'superadmin'|'viewer' }) {
  return (
    <div className="min-h-screen grid" style={{gridTemplateRows:'56px 1fr', gridTemplateColumns:'240px 1fr'}}>
      {/* Header */}
      <header className="col-span-2 flex items-center justify-between px-4 border-b">
        <div className="font-semibold">🚕 IMOTA Admin</div>
        <div className="text-sm">Role: <b>{role}</b></div>
      </header>

      {/* Sidebar */}
      <aside className="border-r p-3 flex flex-col gap-2">
        <NavLink href="/payments" label="Payments" />
        <NavLink href="/payouts" label="Payouts" />
        <NavLink href="/pricing" label="Pricing & Surge" />
        <NavLink href="/broadcasts" label="Broadcasts" />
        <NavLink href="/notifications" label="Notifications" />
      </aside>

      {/* Content */}
      <main className="p-4">{children}</main>
    </div>
  )
}

function NavLink({ href, label }: { href:string, label:string }){
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const active = path === href
  return (
    <Link href={href} className={`px-2 py-1 rounded ${active? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
      {label}
    </Link>
  )
}

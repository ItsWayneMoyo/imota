'use client'
import React from 'react'

export function useRole(): 'superadmin'|'viewer' {
  // The role is stamped by layout into a data attribute for instant read.
  const [role] = React.useState<'superadmin'|'viewer'>(() => {
    if (typeof document !== 'undefined') {
      return (document.body.getAttribute('data-admin-role') as any) || 'superadmin'
    }
    return 'superadmin'
  })
  return role
}

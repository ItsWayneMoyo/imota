import type { AdminRole } from '../common/roles';

declare global {
  namespace Express {
    interface Request {
      adminRole?: AdminRole;
    }
  }
}

export {}; // important so TS treats this as a module

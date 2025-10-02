import { loginAction } from './actions';

export default function Page() {
  return (
    <form action={loginAction} className="max-w-sm space-y-3 p-6 card">
      <h1 className="text-xl font-semibold">Admin sign in</h1>
      <input name="email" type="email" required placeholder="Email" className="border p-2 w-full" />
      <input name="password" type="password" required placeholder="Password" className="border p-2 w-full" />
      <button className="border px-3 py-2">Sign in</button>
      <p className="text-xs text-gray-500">Cookies must be enabled.</p>
    </form>
  );
}

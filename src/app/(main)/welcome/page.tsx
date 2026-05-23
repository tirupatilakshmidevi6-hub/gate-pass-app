import { headers } from 'next/headers';

export default async function WelcomePage() {
  const h    = await headers();
  const role = h.get('x-user-role') ?? '';
  const name = h.get('x-user-name') ?? 'User';

  // Capitalise the role for display
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Logo */}
        <div className="flex justify-center">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-md">
            <img
              src="https://www.image2url.com/r2/default/images/1779254824307-0fca63d9-e1eb-4ccf-bfb4-4c663ca4ae5e.jpeg"
              alt="NxtWave" className="h-10 w-auto object-contain"
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900">Welcome to NxtWave Gate Pass System</h1>
            <p className="text-sm text-gray-500 mt-1">Hello, {name}</p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800 leading-relaxed">
            You are logged in as <strong>{roleDisplay}</strong>.
            Contact your administrator for access to system features.
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Account</span>
              <span className="font-medium text-gray-800">{name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Role</span>
              <span className="font-medium text-gray-800">{roleDisplay}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>

        <p className="text-xs text-gray-400">NxtWave &copy; {new Date().getFullYear()} &bull; Internal Use Only</p>
      </div>
    </div>
  );
}

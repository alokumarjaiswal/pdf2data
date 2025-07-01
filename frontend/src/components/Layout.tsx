import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { commonStyles } from '../theme';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  rightNavItems?: ReactNode;
}

export default function Layout({ children, title, subtitle, rightNavItems }: LayoutProps) {
  const location = useLocation();

  const navigation = [
    { name: 'Upload', href: '/' },
    { name: 'Documents', href: '/list' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen bg-black text-grey-100 flex flex-col overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Page Header */}
        {(title || subtitle) && (
          <div className="bg-grey-900 border-b border-grey-800 flex-shrink-0">
            <div className="max-w-7xl mx-auto px-6 py-6">
              {title && (
                <h1 className="text-2xl font-bold text-grey-100 mb-1">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-grey-400 max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Page Content - Full Height */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-6 h-full">
            {/* Navigation Links - Left and Right */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
              {/* Left Navigation */}
              <div className="flex space-x-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${commonStyles.navLink} ${
                      isActive(item.href)
                        ? commonStyles.navLinkActive
                        : commonStyles.navLinkInactive
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              
              {/* Right Navigation */}
              {rightNavItems && (
                <div className="flex space-x-6">
                  {rightNavItems}
                </div>
              )}
            </div>
            
            {children}
          </div>
        </div>
      </main>


    </div>
  );
} 
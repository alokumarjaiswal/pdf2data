import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { commonStyles } from '../theme';

interface LayoutProps {
  children: ReactNode;
  title?: string | ReactNode;
  subtitle?: string | ReactNode;
  rightNavItems?: ReactNode;
  fullViewport?: boolean;
}

export default function Layout({ children, title, subtitle, rightNavItems, fullViewport = false }: LayoutProps) {
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
      {/* Full Width Navigation Bar */}
      <div className="w-full bg-black border-b border-grey-800 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Left Navigation */}
            <div className="flex space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-xs font-mono transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-grey-200'
                      : 'text-grey-500 hover:text-grey-300'
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
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {fullViewport ? (
          // Full viewport content for pages like upload
          <div className="flex-1 overflow-auto">
            {/* Seamless Page Header */}
            {(title || subtitle) && (
              <div className="max-w-4xl mx-auto px-6 py-6">
                <div className="mb-8">
                  {title && (
                    <h1 className="text-lg font-medium text-grey-200 mb-1 shiny-text flex items-center">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-xs text-grey-500 max-w-3xl font-mono">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}
            {children}
          </div>
        ) : (
          // Regular content layout
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto px-6 py-6">
              {/* Seamless Page Header */}
              {(title || subtitle) && (
                <div className="mb-8">
                  {title && (
                    <h1 className="text-lg font-medium text-grey-200 mb-1 shiny-text flex items-center">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-xs text-grey-500 max-w-3xl font-mono">
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
              
              {children}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 
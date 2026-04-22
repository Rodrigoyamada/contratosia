import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export function AppLayout({ children, noPadding = false }: { children: React.ReactNode, noPadding?: boolean }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col w-full">
                <Header />

                <div className="flex h-full overflow-hidden">
                    {/* Mobile Sidebar Toggle - visible on small screens */}
                    <div className="md:hidden absolute top-4 right-4 z-20">
                        {/* Header handles the user menu, but sidebar toggle might need adjustment if overlapping */}
                    </div>

                    <Sidebar isOpen={sidebarOpen} />

                    {/* Overlay for mobile sidebar */}
                    {sidebarOpen && (
                        <div
                            className="fixed inset-0 z-0 bg-black opacity-50 md:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    <main className={`flex-1 overflow-y-auto relative ${noPadding ? '' : 'p-4 md:p-8'}`}>
                        <button
                            className="md:hidden absolute top-4 left-4 z-10 p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Menu size={20} />
                        </button>
                        <div className="md:mt-0 mt-12 h-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

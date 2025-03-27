'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '../components/SupabaseProvider';
import Image from 'next/image';

export default function Home() {
  const { user, loading } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero section */}
      <div className="flex-1 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 md:pr-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Track Your Streaming History
            </h1>
            <p className="mt-6 text-xl text-gray-300 max-w-xl">
              With Streaming Watch Tracker, never forget what you've watched on Netflix and Disney+. View your history anytime, anywhere.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push('/auth')}
                className="px-8 py-3 text-lg font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Get Started
              </button>
              <a
                href="https://chrome.google.com/webstore/detail/streaming-watch-tracker/[your-extension-id]"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 text-lg font-medium rounded-lg border border-gray-300 text-white hover:bg-gray-700"
              >
                Install Extension
              </a>
            </div>
          </div>
          <div className="mt-12 md:mt-0 md:w-1/2">
            {/* Mock browser with extension */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="rounded-lg shadow-2xl overflow-hidden ring-1 ring-gray-700">
                <div className="bg-gray-800 p-3 flex items-center">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="mx-auto text-gray-400 text-sm">Netflix</div>
                </div>
                <div className="bg-gray-700 aspect-video flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="text-lg font-medium">Streaming Watch Tracker</div>
                    <div className="mt-2 text-sm text-gray-400">Your watch history is being tracked</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center text-xl">1</div>
              <h3 className="mt-4 text-xl font-medium">Install the Extension</h3>
              <p className="mt-2 text-gray-500">Add our Chrome extension to automatically track what you watch on Netflix and Disney+</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center text-xl">2</div>
              <h3 className="mt-4 text-xl font-medium">Watch Content</h3>
              <p className="mt-2 text-gray-500">The extension will automatically detect what you're watching</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center text-xl">3</div>
              <h3 className="mt-4 text-xl font-medium">View Your History</h3>
              <p className="mt-2 text-gray-500">Access your complete viewing history from the extension or this website</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Streaming Watch Tracker</h2>
            <p className="mt-2 text-gray-400">© {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
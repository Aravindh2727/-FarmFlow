import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full py-6 mt-auto border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400 shrink-0 bg-transparent">
      <p>&copy; 2026 AgriFlow AI. All rights reserved.</p>
      <p className="mt-1">
        Developed by Aravindh V &middot;{' '}
        <a
          href="https://aravindh2727.github.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 dark:text-emerald-400 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 rounded px-1"
        >
          Portfolio
        </a>
      </p>
    </footer>
  );
};

export default Footer;

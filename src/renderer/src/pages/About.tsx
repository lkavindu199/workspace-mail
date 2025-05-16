import React from 'react'
import logo from '../assets/pictures/logo.svg'

const About: React.FC = () => {
  const handleExternalLinkClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    e.preventDefault();
    const electron = window.electron as unknown as { openLink: (url: string) => void };
    electron?.openLink('https://mail.squareworkspace.com');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-800 text-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full">
        <img
          src={logo}
          alt="Workspace Mail Logo"
          className="w-80 mx-auto mb-4"
        />
        <h2 className="text-xl font-semibold mb-4">
          Desktop App
          <br />
          Version 1.0
        </h2>
        <p className="text-lg mb-6 text-gray-600">
          A powerful email management tool for productivity and collaboration. Stay connected with ease!
        </p>
        <a
          href="#"
          onClick={handleExternalLinkClick}
          className="text-blue-600 hover:text-blue-800 transition duration-300 text-lg block mb-4"
        >
          Visit SquareWorkspace.com
        </a>
        <p className="text-sm text-gray-500">
          Square Workspace © 2025
          <br />
          All Rights Reserved.
        </p>
      </div>
    </div>
  )
}

export default About

import React, { useState } from 'react'
// import { useLocation } from 'react-router-dom'
import squareLogo from '../assets/pictures/logo.svg'
import gmailLogo from '../assets/pictures/gmail.png'
import outlookLogo from '../assets/pictures/microsoft.png'

interface ServiceModalProps {
  onClose: () => void
  onSelect: (url: string, name: string) => void
  onCustom: (url: string) => void
}

const ServiceModal: React.FC<ServiceModalProps> = ({ onClose, onSelect, onCustom }) => {
  const [customUrl, setCustomUrl] = useState('')
  // const location = useLocation()
  // const params = new URLSearchParams(location.search)
  // const id = params.get('id')

  const handleServiceClick = (url: string): void => {
    onSelect(url, url)
    onClose()
  }

  const handleCustomUrlSubmit = (): void => {
    if (!customUrl) return
    onCustom(customUrl)
    onClose()
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">Add New Email Account to Workspace</h1>

      <p className="mb-6 text-center text-gray-700">
        Please click the logo below to add a new email account.
      </p>

      <div
        className="mb-10 cursor-pointer transition hover:scale-105"
        onClick={() => handleServiceClick('https://protect.squareworkspace.com/')}
      >
        <img src={squareLogo} alt="Square Workspace" className="h-18 object-contain" />
      </div>

      <h3 className="text-xl font-semibold mb-6 text-center">3rd Party Mail Accounts</h3>

      <div className="flex justify-center gap-6 mb-10">
        <div
          className="cursor-pointer transition hover:scale-105"
          onClick={() => handleServiceClick('https://mail.google.com/')}
        >
          <img src={gmailLogo} alt="Gmail" className="h-12 w-16 object-contain" />
        </div>

        <div
          className="cursor-pointer transition hover:scale-105"
          onClick={() => handleServiceClick('https://outlook.office365.com/mail/')}
        >
          <img src={outlookLogo} alt="Microsoft Outlook" className="h-12 w-16 object-contain" />
        </div>
      </div>

      <div className="w-full justify-center">
        <div className="flex mb-2">
          <input
            type="text"
            id="customURL"
            placeholder="Enter custom email URL"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="border border-gray-300 rounded-l-md p-2 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            id="confirmCustomURL"
            onClick={handleCustomUrlSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition"
          >
            Go
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Please enter the entire URL for custom email accounts. e.g., https://mail.yahoo.com
        </p>
      </div>

      {/* Optional Cancel Button */}
      {/*
  <button onClick={onClose} className="text-sm text-gray-500 hover:underline mt-6">
    Cancel
  </button>
  */}
    </div>
  )
}

export default ServiceModal

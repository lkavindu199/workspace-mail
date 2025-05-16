import { useLocation } from 'react-router-dom'
import ServiceModal from '../components/ServiceModal'
import { JSX } from 'react'

export default function ServiceModalPage(): JSX.Element {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const id = params.get('id') || ''

  const handleSelect = (url: string): void => {
    window.electron?.openNewWindow?.(url, id)
  }

  const handleCustom = (url: string): void => {
    window.electron?.openNewWindow?.(url, id)
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <ServiceModal onSelect={handleSelect} onCustom={handleCustom} onClose={() => {}} />
    </div>
  )
}

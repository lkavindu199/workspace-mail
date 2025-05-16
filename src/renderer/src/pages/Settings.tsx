import { useEffect, useState, useCallback } from 'react'
import { FolderOpen, Trash2, Save, Plus, Eye, EyeOff } from 'lucide-react'

declare global {
  interface Window {
    electron: {
      activateTab(fallbackTabId: string): unknown
      openNewWindow(arg0: string, id: string): unknown
      getStoreValue: <T = unknown>(key: string) => Promise<T>
      setStoreValue: (key: string, value: string | number | boolean | object | null) => Promise<void>
      browseStorageLocation: () => Promise<string>
      clearStore: () => Promise<{ success: boolean; message: string }>
      getTabs: () => Promise<any[]>
      saveTabs: (tabs: any[]) => Promise<void>
      encrypt: (text: string) => Promise<string>
      decrypt: (text: string) => Promise<string>
      ipcRenderer: {
        send: (channel: string, data: unknown) => void
      }
    }
  }
  interface SettingsProps {
    activeTabId: string
    setActiveTabId: (id: string) => void
  }
}

interface Tab {
  id: string
  title: string
  url: string
  username: string
  password: string
  service?: string
  showPassword: boolean
  isNew?: boolean
}

const Settings = ({ setActiveTabId }: SettingsProps) => {
  const [storageLocation, setStorageLocation] = useState('')
  const [tabs, setTabs] = useState<Tab[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchStorageLocation = async () => {
      try {
        const location = await window.electron.getStoreValue('storageLocation')
        if (typeof location === 'string') {
          setStorageLocation(location)
        }
      } catch (err) {
        console.error('Failed to get storage location:', err)
      }
    }
    fetchStorageLocation()
  }, [])

  useEffect(() => {
    const fetchTabs = async () => {
      try {
        const savedTabs = await window.electron.getTabs()
        const decryptedTabs = await Promise.all(
          savedTabs.map(async (tab) => {
            try {
              const decryptedPassword = tab.password
                ? await window.electron.decrypt(tab.password)
                : ''

              let service = 'custom'
              if (tab.url.includes('squareworkspace.com')) {
                service = 'squareworkspace'
              } else if (tab.url.includes('google.com')) {
                service = 'gmail'
              } else if (tab.url.includes('outlook.live.com')) {
                service = 'outlook'
              }

              return {
                ...tab,
                password: decryptedPassword || tab.password,
                showPassword: false,
                service,
              }
            } catch (err) {
              console.error('Failed to decrypt tab:', tab.id, err)
              return {
                ...tab,
                password: '',
                showPassword: false,
                service: tab.service || 'custom',
              }
            }
          })
        )
        setTabs(decryptedTabs)
      } catch (err) {
        console.error('Failed to fetch tabs:', err)
      }
    }

    fetchTabs()
  }, [])

  const handleBrowse = async () => {
    try {
      const newLocation = await window.electron.browseStorageLocation()
      if (newLocation) {
        await window.electron.setStoreValue('storageLocation', newLocation)
        setStorageLocation(newLocation)
        alert('Storage location set successfully.')
      }
    } catch (err) {
      console.error('Failed to browse storage location:', err)
    }
  }

  const handleClearStore = async () => {
    try {
      const response = await window.electron.clearStore()
      if (response.success) {
        const id = Math.random().toString(36).substring(2)
        window.electron?.openNewWindow(`/clear`, id)
        alert(response.message)
        setStorageLocation('')
        window.electron.ipcRenderer.send('refresh-all', null)
      }
    } catch (error) {
      console.error('Failed to clear store:', error)
    }
  }

  const handleTabChange = useCallback((
    index: number,
    field: 'title' | 'url' | 'username' | 'password' | 'service',
    value: string
  ) => {
    setTabs(prevTabs => {
      const newTabs = [...prevTabs]
      newTabs[index] = {
        ...newTabs[index],
        [field]: value
      }

      // Handle service-specific URL updates
      if (field === 'service') {
        let url = ''
        switch (value) {
          case 'squareworkspace':
            url = 'https://mail.squareworkspace.com/'
            break
          case 'gmail':
            url = 'https://mail.google.com'
            break
          case 'outlook':
            url = 'https://outlook.live.com'
            break
          case 'custom':
            url = newTabs[index].url.includes('mail.')
              ? newTabs[index].url
              : ''
            break
        }
        newTabs[index].url = url
      }

      // Auto-detect service from URL
      if (field === 'url') {
        if (value.includes('squareworkspace')) {
          newTabs[index].service = 'squareworkspace'
        } else if (value.includes('google')) {
          newTabs[index].service = 'gmail'
        } else if (value.includes('outlook')) {
          newTabs[index].service = 'outlook'
        } else {
          newTabs[index].service = 'custom'
        }
      }

      return newTabs
    })
  }, [])

  const handleDeleteTab = async (index: number) => {
    try {
      const updatedTabs = tabs.filter((_, i) => i !== index)

      // Encrypt passwords before saving
      const tabsToSave = await Promise.all(
        updatedTabs.map(async tab => ({
          ...tab,
          password: tab.password ? await window.electron.encrypt(tab.password) : '',
          showPassword: false
        }))
      )

      await window.electron.saveTabs(tabsToSave)

      setTabs(updatedTabs)

      // Reset the active tab if needed
      if (updatedTabs.length > 0) {
        const fallbackTabId = updatedTabs[0].id
        setActiveTabId(fallbackTabId)
        window.electron.activateTab(fallbackTabId)
        window.electron.setStoreValue('activeTabId', fallbackTabId)
      } else {
        const id = Math.random().toString(36).substring(2)
        window.electron.openNewWindow('/clear', id)
      }

      alert('Tab deleted successfully.')
      window.electron.ipcRenderer.send('refresh-all', null)
    } catch (err) {
      console.error('Failed to delete tab:', err)
      alert('Failed to delete tab. See console for details.')
    }
  }

  const handleAddTab = async () => {
    const newTab = {
      id: Math.random().toString(36).substring(2),
      title: 'New Tab',
      url: 'https://mail.squareworkspace.com/',
      username: '',
      password: '',
      service: 'squareworkspace' as const,
      showPassword: false,
      isNew: true
    }

    try {
      setTabs(prevTabs => [...prevTabs, newTab])
      setActiveTabId(newTab.id)
    } catch (err) {
      console.error('Failed to add new tab:', err)
    }
  }

  const handleSaveSingleTab = async () => {
    if (isSaving) return
    setIsSaving(true)

    try {
      // Validate
      if (tabs.some(tab => tab.title.trim() === '')) {
        alert('Please enter a title for all tabs before saving.')
        return
      }

      // Create a copy for saving (with encrypted passwords)
      const tabsToSave = await Promise.all(
        tabs.map(async tab => ({
          ...tab,
          password: tab.password ? await window.electron.encrypt(tab.password) : '',
          showPassword: false
        }))
      )

      // Save to electron store
      await window.electron.saveTabs(tabsToSave)

      // Update local state (keeping passwords decrypted)
      setTabs(prevTabs =>
        prevTabs.map(tab => ({
          ...tab,
          showPassword: false,
          isNew: false
        }))
      )
      if (tabsToSave.length > 0) {
        const fallbackTabId = tabsToSave[0].id
        setActiveTabId(fallbackTabId)
        window.electron.activateTab(fallbackTabId)
        window.electron.setStoreValue('activeTabId', fallbackTabId)
      }
      alert('Tabs saved successfully.')
      window.electron.ipcRenderer.send('refresh-all', null)
    } catch (err) {
      console.error('Failed to save tabs:', err)
      alert('Failed to save tabs. See console for details.')
    } finally {
      setIsSaving(false)
    }
  }

  const togglePasswordVisibility = (index: number) => {
    setTabs(prevTabs => {
      const newTabs = [...prevTabs]
      newTabs[index] = {
        ...newTabs[index],
        showPassword: !newTabs[index].showPassword
      }
      return newTabs
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-5xl w-full">
        <h2 className="text-3xl font-bold mb-8 text-center">Settings</h2>

        {/* Storage Location */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold mb-2">Attachment Storage Location</h3>
          <div className="mb-3 text-sm text-gray-500">
            {storageLocation || 'No location selected. Default is Downloads folder.'}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleBrowse}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
            >
              <FolderOpen size={16} />
              Browse
            </button>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="overflow-x-auto mb-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Saved Tabs</h3>
            <button
              onClick={handleAddTab}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition"
            >
              <Plus size={16} />
              Add New Tab
            </button>
          </div>
          <table className="min-w-full bg-white rounded-xl shadow-md border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left w-90">Title</th>
                <th className="py-2 px-4 border-b text-left w-95">Service</th>
                <th className="py-2 px-4 border-b text-left w-80">URL</th>
                <th className="py-2 px-4 border-b text-left w-70">Username</th>
                <th className="py-2 px-4 border-b text-left w-70">Password</th>
                <th className="py-2 px-4 border-b text-center w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tabs.map((tab, index) => (
                <tr key={tab.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">
                    <input
                      type="text"
                      value={tab.title}
                      onChange={(e) => handleTabChange(index, 'title', e.target.value)}
                      className="border p-1 rounded w-full"
                      maxLength={20}
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <select
                      value={tab.service}
                      onChange={(e) => handleTabChange(index, 'service', e.target.value)}
                      className="border p-1 rounded w-full"
                    >
                      <option value="squareworkspace">SquareWorkspace</option>
                      <option value="gmail">Gmail</option>
                      <option value="outlook">Outlook</option>
                      <option value="custom">Custom</option>
                    </select>
                  </td>
                  <td className="py-2 px-4 border-b text-blue-600 truncate max-w-xs">
                    <input
                      type="text"
                      value={tab.url}
                      onChange={(e) => handleTabChange(index, 'url', e.target.value)}
                      className="border p-1 rounded w-full"
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <input
                      type="text"
                      value={tab.username}
                      onChange={(e) => handleTabChange(index, 'username', e.target.value)}
                      className="border p-1 rounded w-full"
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <div className="relative">
                      <input
                        type={tab.showPassword ? 'text' : 'password'}
                        value={tab.password}
                        onChange={(e) => handleTabChange(index, 'password', e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                      <button
                        onClick={() => togglePasswordVisibility(index)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      >
                        {tab.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-4 border-b">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={handleSaveSingleTab}
                        disabled={isSaving}
                        className={`flex items-center gap-1 ${isSaving ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm px-3 py-1 rounded-md transition`}
                      >
                        <Save size={14} />
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => handleDeleteTab(index)}
                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded-md transition"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Reset Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Reset Application</h3>
          <button
            onClick={handleClearStore}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition"
          >
            <Trash2 size={16} />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings

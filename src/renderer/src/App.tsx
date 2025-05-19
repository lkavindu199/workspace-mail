import { useState, useEffect, JSX } from 'react'
import Tabs from './components/Tabs'

type Tab = {
  id: string
  title: string
  url: string
  username?: string
  password?: string
}

export default function App(): JSX.Element {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  useEffect(() => {
    const loadTabs = async (): Promise<void> => {
      const storedTabs: Tab[] = (await window.electron?.getTabs()) || []
      const storedActiveTabId: string | null =
        (await window.electron?.getStoreValue('activeTabId')) || null

      if (storedTabs.length > 0) {
        setTabs(storedTabs)

        const validActiveTab = storedTabs.find((tab) => tab.id === storedActiveTabId)
        setActiveTabId(validActiveTab?.id || storedTabs[0].id)
      } else {
        // If no tabs stored, initialize a default one
      //   const id = Math.random().toString(36).substring(2)
      //   const newTab: Tab = {
      //     id,
      //     title: 'Default',
      //     url: 'https://protect.squareworkspace.com/',
      //     username: '',
      //     password: ''
      //   }
      //   window.electron?.openNewWindow(`${newTab.url}?id=${id}`, id)
      //   setTabs([newTab])
      //   setActiveTabId(id)
      //   await window.electron?.saveTabs([newTab])
      //   await window.electron?.setStoreValue('activeTabId', id)
      }
    }

    loadTabs()
  }, [])

  useEffect(() => {
    if (tabs.length > 0) {
      window.electron?.saveTabs(tabs)
    }
  }, [tabs])

  useEffect(() => {
    if (activeTabId) {
      window.electron?.setStoreValue('activeTabId', activeTabId)
    }
  }, [activeTabId])

  // const openTab = (url: string, title: string): void => {
  //   const id = Math.random().toString(36).substring(2)
  //   const newTab: Tab = { id, title, url, username: '', password: '' }
  //   window.electron?.openNewWindow(`/${url}?id=${id}`, id)

  //   const updatedTabs = [...tabs, newTab]
  //   setTabs(updatedTabs)
  //   setActiveTabId(id)
  // }

  const handleAddTabClick = (): void => {
    // openTab('modal', 'Select Service')
    window.electron.openNewWindow('/settings', 'settings');
  }

  const handleRemoveTab = (tabId: string): void => {
    const newTabs = tabs.filter((tab) => tab.id !== tabId)
    setTabs(newTabs)

    if (newTabs.length > 0) {
      const fallbackTabId = newTabs[0].id
      setActiveTabId(fallbackTabId)
      window.electron?.activateTab(fallbackTabId)
      window.electron?.setStoreValue('activeTabId', fallbackTabId)
    } else {

      // All tabs removed, create a default tab
      // const id = Math.random().toString(36).substring(2)
      // const newTab: Tab = {
      //   id,
      //   title: 'Default',
      //   url: 'https://protect.squareworkspace.com/',
      //   username: '',
      //   password: ''
      // }
      // window.electron?.openNewWindow(`${newTab.url}?id=${id}`, id)
      // setTabs([newTab])
      // setActiveTabId(id)
      // window.electron?.saveTabs([newTab])
      // window.electron?.setStoreValue('activeTabId', id)
    }

    window.electron?.saveTabs(newTabs)
  }

  const handleTabClick = (tabId: string): void => {
    setActiveTabId(tabId)
    window.electron?.activateTab(tabId)
  }

  const handleReorderTabs = (fromIndex: number, toIndex: number): void => {
    const reorderedTabs = [...tabs]
    const [movedTab] = reorderedTabs.splice(fromIndex, 1)
    reorderedTabs.splice(toIndex, 0, movedTab)
    setTabs(reorderedTabs)
  }

  const handleRenameTab = (tabId: string, newTitle: string): void => {
    const updatedTabs = tabs.map((tab) => (tab.id === tabId ? { ...tab, title: newTitle } : tab))
    setTabs(updatedTabs)
  }

  return (
    <div className="w-full h-screen flex flex-col">
      <Tabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onAddTabClick={handleAddTabClick}
        onRemoveTab={handleRemoveTab}
        onReorderTabs={handleReorderTabs}
        onRenameTab={handleRenameTab}
      />
    </div>
  )
}

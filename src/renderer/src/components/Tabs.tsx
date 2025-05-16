import React, { useState } from 'react'

interface Tab {
  id: string
  title: string
}

interface TabsProps {
  tabs: Tab[]
  activeTabId: string | null
  onTabClick: (tabId: string) => void
  onAddTabClick: () => void
  onRemoveTab: (tabId: string) => void
  onReorderTabs: (fromIndex: number, toIndex: number) => void
  onRenameTab: (tabId: string, newTitle: string) => void
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  onAddTabClick,
  // onRemoveTab,
  onReorderTabs,
  onRenameTab
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const handleDragStart = (e: React.DragEvent, fromIndex: number) => {
    e.dataTransfer.setData('fromIndex', fromIndex.toString())
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    const fromIndex = parseInt(e.dataTransfer.getData('fromIndex'), 10)
    onReorderTabs(fromIndex, toIndex)
  }

  const handleRename = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (tab) {
      setEditingTabId(tabId)
      setEditingTitle(tab.title)
    }
  }

  const handleRenameSubmit = () => {
    if (editingTabId && editingTitle.trim()) {
      onRenameTab(editingTabId, editingTitle.trim())
    }
    setEditingTabId(null)
  }

  return (
    <div className="flex bg-gray-800 p-2 space-x-2">
  {tabs.map((tab, index) => (
    <div
      key={tab.id}
      className={`flex items-center px-4 mr-1 rounded transition-all h-[39px] ${
        tab.id === activeTabId
          ? 'bg-blue-500 text-white'
          : 'bg-gray-600 text-white'
      }`}
      draggable
      onDragStart={(e) => handleDragStart(e, index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e, index)}
      onClick={() => onTabClick(tab.id)}
      onDoubleClick={() => handleRename(tab.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        handleRename(tab.id)
      }}
      style={{ height: '39px', width: 'auto' }}
    >
      {editingTabId === tab.id ? (
        <input
          className="bg-white text-black border p-1 rounded w-auto min-w-[120px] max-w-[200px] h-6"
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit()
          }}
          autoFocus
          maxLength={20}
        />
      ) : (
        <>
          <span className="truncate">{tab.title}</span>
          {/* <button
            onClick={(e) => {
              e.stopPropagation()
              onRemoveTab(tab.id)
            }}
            className="ml-2 text-white"
          >
            ×
          </button> */}
        </>
      )}
    </div>
  ))}

  <button
    onClick={onAddTabClick}
    className="flex items-center justify-center rounded-full px-3 h-[39px] w-[39px] bg-green-600 text-white rounded"
  >
    <span className="">+</span>
  </button>
</div>

  )
}

export default Tabs

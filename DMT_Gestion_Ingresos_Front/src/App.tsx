import { useState, useEffect } from 'react'
import { CatalogosConfig, Dashboard, SelectModule, FormPeatonal, FormVehicular } from '@/pages'
import '@/styles/globals.css'

type Modal = 'select-module' | 'form-peatonal' | 'form-vehicular' | null
type Theme = 'dark' | 'light'

function App() {
  const [activeModal, setActiveModal] = useState<Modal>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [])

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleNewRegistro = () => {
    setActiveModal('select-module')
  }

  const handleOpenConfig = () => {
    setConfigOpen(true)
  }

  const handleCloseConfig = () => {
    setConfigOpen(false)
  }

  const handleClose = () => {
    setActiveModal(null)
  }

  const handleSelectPeatonal = () => {
    setActiveModal('form-peatonal')
  }

  const handleSelectVehicular = () => {
    setActiveModal('form-vehicular')
  }

  const handleFormSubmit = (data: any) => {
    console.log('Registro guardado:', data)
    window.dispatchEvent(new Event('dmt-registro-creado'))
    setActiveModal(null)
  }

  return (
    <>
      <Dashboard
        onNewRegistro={handleNewRegistro}
        onToggleTheme={handleToggleTheme}
        onConfig={handleOpenConfig}
        currentTheme={theme}
      />
      
      {activeModal === 'select-module' && (
        <SelectModule
          onSelectPeatonal={handleSelectPeatonal}
          onSelectVehicular={handleSelectVehicular}
          onClose={handleClose}
        />
      )}
      
      {activeModal === 'form-peatonal' && (
        <FormPeatonal
          onClose={handleClose}
          onSubmit={handleFormSubmit}
        />
      )}
      
      {activeModal === 'form-vehicular' && (
        <FormVehicular
          onClose={handleClose}
          onSubmit={handleFormSubmit}
        />
      )}

      {configOpen && (
        <CatalogosConfig onClose={handleCloseConfig} />
      )}
    </>
  )
}

export default App

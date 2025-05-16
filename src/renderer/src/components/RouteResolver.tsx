import React from 'react'
import { useNavigate } from 'react-router-dom'

const RouteResolver: React.FC = () => {
  const navigate = useNavigate()
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const route = params.get('route')
    if (route) navigate(`/${route}`)
  }, [])
  return null
}

export default RouteResolver

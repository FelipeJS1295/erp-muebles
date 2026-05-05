import { Routes, Route, Navigate } from 'react-router-dom'
import WorkerLogin from './worker/pages/WorkerLogin'
import WorkerHome from './worker/pages/WorkerHome'

function useWorkerAuth() {
  const token = localStorage.getItem('worker_token')
  const trabajador = localStorage.getItem('worker_data')
  return { autenticado: !!token, trabajador: trabajador ? JSON.parse(trabajador) : null }
}

function WorkerPrivate({ children }: { children: React.ReactNode }) {
  const { autenticado } = useWorkerAuth()
  if (!autenticado) return <Navigate to="/worker/login" replace />
  return <>{children}</>
}

export default function WorkerRouter() {
  return (
    <Routes>
      <Route path="/worker/login" element={<WorkerLogin />} />
      <Route path="/worker/*" element={
        <WorkerPrivate>
          <WorkerHome />
        </WorkerPrivate>
      } />
    </Routes>
  )
}

export { useWorkerAuth }
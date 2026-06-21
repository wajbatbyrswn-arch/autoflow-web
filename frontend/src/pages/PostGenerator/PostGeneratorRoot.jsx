import { Routes, Route, Navigate } from 'react-router-dom'
import PostGeneratorHome from './PostGeneratorHome'
import BrandSetup from './BrandSetup'
import PostGenerator from './PostGenerator'
import PostHistory from './PostHistory'
import './PostGenerator.css'

export default function PostGeneratorRoot() {
  return (
    <Routes>
      <Route path="/" element={<PostGeneratorHome />} />
      <Route path="/setup" element={<BrandSetup />} />
      <Route path="/create" element={<PostGenerator />} />
      <Route path="/history" element={<PostHistory />} />
      <Route path="*" element={<Navigate to="/post-generator" replace />} />
    </Routes>
  )
}

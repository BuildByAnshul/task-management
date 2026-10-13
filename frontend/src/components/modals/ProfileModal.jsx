import { useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useMutation } from '@tanstack/react-query'
import {
  X, User, Mail, Lock, Shield, Check,
  Camera, Eye, EyeOff, UploadCloud, Trash2,
  Save, Loader2, Sparkles, Image as ImageIcon
} from 'lucide-react'
import { selectUser, updateUser } from '../../store/authSlice'
import { closeProfileModal } from '../../store/uiSlice'
import Avatar from '../ui/Avatar'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function ProfileModal() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'security'
  const [name, setName] = useState(user?.name || '')
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(user?.avatarUrl || '')

  // Local file state
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    processSelectedFile(file)
  }

  const processSelectedFile = (file) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP, GIF)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setSelectedFile(file)
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
  }

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    processSelectedFile(file)
  }

  // Remove avatar handler (revert to initials)
  const handleRemoveAvatar = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setCurrentAvatarUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Profile save mutation
  const profileMutation = useMutation({
    mutationFn: async (payload) => {
      // Step 1: If user picked a local image file, upload it to Cloudinary first
      let updatedAvatarUrl = currentAvatarUrl

      if (selectedFile) {
        setIsUploadingAvatar(true)
        const formData = new FormData()
        formData.append('avatar', selectedFile)

        const { data: uploadRes } = await api.post('/auth/profile/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        if (uploadRes?.data?.avatarUrl) {
          updatedAvatarUrl = uploadRes.data.avatarUrl
        }
        setIsUploadingAvatar(false)
      }

      // Step 2: Update user profile with name, avatarUrl, and optional password change
      const updatePayload = {
        name: payload.name,
        avatarUrl: updatedAvatarUrl,
      }

      if (payload.currentPassword && payload.newPassword) {
        updatePayload.currentPassword = payload.currentPassword
        updatePayload.newPassword = payload.newPassword
      }

      const { data } = await api.patch('/auth/profile', updatePayload)
      return data.data
    },
    onSuccess: (data) => {
      if (data?.user) {
        dispatch(updateUser(data.user))
      }
      toast.success(data?.message || 'Profile updated successfully!')
      // Reset sensitive fields
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSelectedFile(null)
      dispatch(closeProfileModal())
    },
    onError: (err) => {
      setIsUploadingAvatar(false)
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update profile'
      toast.error(msg)
    },
  })

  const handleSave = (e) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    const payload = {
      name: name.trim(),
    }

    if (activeTab === 'security' || newPassword) {
      if (!currentPassword) {
        toast.error('Please enter your current password to change it')
        return
      }
      if (newPassword.length < 6) {
        toast.error('New password must be at least 6 characters')
        return
      }
      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match')
        return
      }
      payload.currentPassword = currentPassword
      payload.newPassword = newPassword
    }

    profileMutation.mutate(payload)
  }

  // Active display avatar (local preview takes priority over current stored avatar)
  const displayAvatar = previewUrl || currentAvatarUrl

  const previewUser = {
    ...user,
    name,
    avatarUrl: displayAvatar,
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeProfileModal())}>
      <div
        className="modal-content max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-teal-50/40 via-white to-amber-50/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-teal/10 text-brand-teal flex items-center justify-center font-bold">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Account Settings</h2>
              <p className="text-xs text-gray-500">Manage your profile details & credentials</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(closeProfileModal())}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-2 bg-gray-50/50 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-brand-teal text-brand-teal'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <User size={15} />
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'border-brand-teal text-brand-teal'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Lock size={15} />
            Password & Security
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave}>
          <div className="p-5 sm:p-6 space-y-6 max-h-[65vh] overflow-y-auto">
            {activeTab === 'profile' ? (
              <>
                {/* Local Avatar Upload Zone (Stored in Cloudinary) */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2.5">
                    Profile Picture
                  </label>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col sm:flex-row items-center gap-5 ${
                      isDragging
                        ? 'border-brand-teal bg-teal-50/60'
                        : 'border-gray-200 bg-gray-50/40 hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Avatar Preview */}
                    <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Avatar
                        user={previewUser}
                        size="xl"
                        className="ring-4 ring-white shadow-md w-20 h-20 text-xl"
                      />
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-0.5">
                        <Camera size={18} />
                        <span>Change</span>
                      </div>
                    </div>

                    {/* Actions and Local File Input */}
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-2">
                        {/* Hidden file input */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/png, image/jpeg, image/webp, image/gif"
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <UploadCloud size={15} />
                          Upload from Computer
                        </button>

                        {displayAvatar && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-gray-200 cursor-pointer"
                          >
                            <Trash2 size={14} />
                            Remove Photo
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mb-1">
                        {selectedFile ? (
                          <span className="font-semibold text-brand-teal flex items-center justify-center sm:justify-start gap-1">
                            <Check size={13} /> Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </span>
                        ) : (
                          'Drag & drop an image or click above to choose from your computer'
                        )}
                      </p>

                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-gray-400">
                        <Sparkles size={12} className="text-amber-500" />
                        <span>PNG, JPG, WebP, GIF up to 5MB · Auto-synced to Cloudinary</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Name & Email inputs */}
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Your full name"
                        className="pill-input pl-10 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="pill-input pl-10 w-full bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Email address is linked to your account credentials.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* Security & Password Tab */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2.5">
                  <Shield size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p>
                    To change your password, provide your current password followed by your new desired password (at least 6 characters).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="pill-input pl-10 pr-10 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="pill-input pl-10 pr-10 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="pill-input pl-10 w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-6 pt-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-xs text-gray-400 hidden sm:inline">
              Changes sync across all active sessions
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => dispatch(closeProfileModal())}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileMutation.isPending || isUploadingAvatar}
                className="btn-primary flex items-center gap-1.5 px-5 py-2 text-sm disabled:opacity-60 cursor-pointer"
              >
                {profileMutation.isPending || isUploadingAvatar ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    {isUploadingAvatar ? 'Uploading to Cloudinary…' : 'Saving…'}
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

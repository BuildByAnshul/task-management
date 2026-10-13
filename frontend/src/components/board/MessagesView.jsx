import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageSquare, Clock, User } from 'lucide-react'
import { selectUser } from '../../store/authSlice'
import { getSocket } from '../../lib/socket'
import api from '../../lib/api'
import Avatar from '../ui/Avatar'
import toast from 'react-hot-toast'

export default function MessagesView({ boardId }) {
  const user = useSelector(selectUser)
  const queryClient = useQueryClient()
  const [inputText, setInputText] = useState('')
  const [liveMessages, setLiveMessages] = useState([])
  const messagesEndRef = useRef(null)

  // Fetch board messages
  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ['messages', boardId],
    queryFn: async () => {
      const { data } = await api.get(`/boards/${boardId}/messages`)
      return data.data.messages || []
    },
    enabled: !!boardId,
  })

  useEffect(() => {
    if (initialMessages) {
      setLiveMessages(initialMessages)
    }
  }, [initialMessages])

  // Listen to socket 'message:new'
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNewMessage = ({ message }) => {
      if (message && message.board === boardId) {
        setLiveMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev
          return [...prev, message]
        })
      }
    }

    socket.on('message:new', handleNewMessage)
    return () => {
      socket.off('message:new', handleNewMessage)
    }
  }, [boardId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveMessages])

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (text) => {
      const { data } = await api.post(`/boards/${boardId}/messages`, { text })
      return data.data.message
    },
    onSuccess: (newMessage) => {
      setLiveMessages(prev => {
        if (prev.some(m => m._id === newMessage._id)) return prev
        return [...prev, newMessage]
      })
      setInputText('')
    },
    onError: () => toast.error('Failed to send message'),
  })

  const handleSend = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    sendMutation.mutate(inputText.trim())
  }

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] max-h-[700px] p-4 sm:p-6">
      {/* Messages Card */}
      <div className="card flex-1 flex flex-col overflow-hidden bg-white/90 shadow-sm border border-gray-100">
        {/* Messages Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Team Discussion</h3>
              <p className="text-xs text-gray-400">Live chat for this board</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
            {liveMessages.length} messages
          </span>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Loading conversation…
            </div>
          ) : liveMessages.length > 0 ? (
            liveMessages.map((msg) => {
              const isMe = (msg.sender?._id || msg.sender) === (user?._id || user?.id)
              const senderName = msg.sender?.name || 'Collaborator'
              const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

              return (
                <div
                  key={msg._id}
                  className={`flex gap-3 items-end ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <div className="flex-shrink-0 mb-1">
                      <Avatar user={msg.sender} size="sm" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMe && (
                      <span className="text-[11px] font-semibold text-gray-500 mb-1 ml-1">
                        {senderName}
                      </span>
                    )}

                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-brand-teal text-white rounded-br-xs'
                          : 'bg-gray-100 text-gray-800 rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>

                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                      {time}
                    </span>
                  </div>

                  {isMe && (
                    <div className="flex-shrink-0 mb-1">
                      <Avatar user={user} size="sm" />
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-gray-400">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-brand-teal flex items-center justify-center mb-3">
                <MessageSquare size={22} />
              </div>
              <p className="text-sm font-semibold text-gray-700">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Start the conversation with your team members working on this workspace!
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50/50 flex gap-2">
          <input
            type="text"
            placeholder="Type a message to the team…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sendMutation.isPending}
            className="pill-input flex-1 bg-white text-sm py-2.5 px-4"
          />
          <button
            type="submit"
            disabled={sendMutation.isPending || !inputText.trim()}
            className="btn-primary px-4 py-2 flex items-center gap-1.5 disabled:opacity-50 text-sm"
          >
            <Send size={15} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  )
}

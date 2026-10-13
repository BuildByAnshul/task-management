import { useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { setBoardData, selectActiveTab, selectBoard } from '../store/boardSlice'
import { joinBoard, leaveBoard } from '../lib/socket'
import BoardHeader from '../components/board/BoardHeader'
import BoardTabs from '../components/board/BoardTabs'
import BoardView from '../components/board/BoardView'
import OverviewView from '../components/board/OverviewView'
import ListView from '../components/board/ListView'
import CalendarView from '../components/board/CalendarView'
import MessagesView from '../components/board/MessagesView'
import TaskModal from '../components/tasks/TaskModal'
import InviteModal from '../components/board/InviteModal'
import ActivityPanel from '../components/board/ActivityPanel'
import { selectTaskModal, selectInviteModalOpen, selectActivityPanelOpen } from '../store/uiSlice'
import BoardSkeleton from '../components/board/BoardSkeleton'

export default function BoardPage() {
  const { boardId } = useParams()
  const dispatch = useDispatch()
  const activeTab = useSelector(selectActiveTab)
  const taskModal = useSelector(selectTaskModal)
  const inviteOpen = useSelector(selectInviteModalOpen)
  const activityOpen = useSelector(selectActivityPanelOpen)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const { data } = await api.get(`/boards/${boardId}`)
      return data.data
    },
    enabled: !!boardId,
    refetchInterval: 60000, // safety-net resync every 60s
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (data) {
      dispatch(setBoardData(data))
      joinBoard(boardId)
      if (boardId) {
        localStorage.setItem('novaboard_last_board', boardId)
      }
    }
    return () => {
      if (boardId) leaveBoard(boardId)
    }
  }, [data, boardId, dispatch])

  // Visibility-based refresh
  useEffect(() => {
    const handler = () => {
      if (!document.hidden) refetch()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [refetch])

  if (isLoading) return <BoardSkeleton />
  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-500 font-medium">Failed to load board</p>
        <button onClick={() => refetch()} className="btn-secondary mt-4">Try again</button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full relative">
      <BoardHeader />
      <BoardTabs />

      {activeTab === 'board' && <BoardView />}
      {activeTab === 'overview' && <OverviewView />}
      {activeTab === 'list' && <ListView />}
      {activeTab === 'calendar' && <CalendarView />}
      {activeTab === 'messages' && <MessagesView boardId={boardId} />}

      {taskModal.open && <TaskModal taskId={taskModal.taskId} defaultStatus={taskModal.status} boardId={boardId} />}
      {inviteOpen && <InviteModal boardId={boardId} />}
      {activityOpen && <ActivityPanel boardId={boardId} />}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import './App.css'

ChartJS.register(ArcElement, Tooltip, Legend)

function App() {
  const [todos, setTodos] = useState(() => {
    const savedTodos = localStorage.getItem('todos')
    return savedTodos ? JSON.parse(savedTodos) : []
  })
  const [newTodo, setNewTodo] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [newPriority, setNewPriority] = useState('medium') // 'low', 'medium', 'high'
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [editingDeadline, setEditingDeadline] = useState('')
  const [editingPriority, setEditingPriority] = useState('medium')
  const [filter, setFilter] = useState('all') // 'all', 'active', 'completed'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('priority-high') // yeni state ekle

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    setTodos([...todos, {
      id: Date.now(),
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      deadline: newDeadline || null,
      priority: newPriority
    }])
    setNewTodo('')
    setNewDeadline('')
    setNewPriority('medium')
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const startEditing = (todo) => {
    setEditingId(todo.id)
    setEditingText(todo.text)
    setEditingDeadline(todo.deadline ? new Date(todo.deadline).toISOString().split('T')[0] : '')
    setEditingPriority(todo.priority)
  }

  const saveEdit = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, text: editingText, deadline: editingDeadline ? new Date(editingDeadline).toISOString() : null, priority: editingPriority } : todo
    ))
    setEditingId(null)
  }

  const getDeadlineStatus = (deadline) => {
    if (!deadline) return null
    
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffTime < 0) return 'overdue'
    if (diffDays <= 2) return 'close'
    return 'normal'
  }

  // Yarım saatlik aralıkları ayarlamak için yardımcı fonksiyon
  const roundToNearestThirtyMinutes = (date) => {
    const minutes = 30
    const ms = 1000 * 60 * minutes
    return new Date(Math.round(date.getTime() / ms) * ms)
  }

  // Minimum tarih için bugünün tarihini ayarla
  const today = new Date()
  const minDateTime = roundToNearestThirtyMinutes(today).toISOString().slice(0, 16)

  const formatDeadline = (deadline) => {
    if (!deadline) return ''
    const status = getDeadlineStatus(deadline)
    const date = new Date(deadline).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    return (
      <div className={`deadline-badge ${status ? `deadline-${status}` : ''}`}>
        {status === 'overdue' && '⚠️ '}
        {status === 'close' && '⏰ '}
        {date}
      </div>
    )
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(todos)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setTodos(items)
  }

  // Sıralama fonksiyonu
  const sortTodos = (todos) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    
    return [...todos].sort((a, b) => {
      switch (sortBy) {
        case 'priority-high':
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'priority-low':
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        case 'deadline':
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline) - new Date(b.deadline)
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt)
        default:
          return 0
      }
    })
  }

  // filteredAndSearchedTodos'u güncelle
  const filteredAndSearchedTodos = sortTodos(
    todos
      .filter(todo => {
        if (filter === 'active') return !todo.completed
        if (filter === 'completed') return todo.completed
        return true
      })
      .filter(todo => 
        todo.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
  )

  // İstatistik verileri
  const stats = {
    total: todos.length,
    completed: todos.filter(todo => todo.completed).length,
    high: todos.filter(todo => todo.priority === 'high').length,
    medium: todos.filter(todo => todo.priority === 'medium').length,
    low: todos.filter(todo => todo.priority === 'low').length,
    overdue: todos.filter(todo => todo.deadline && getDeadlineStatus(todo.deadline) === 'overdue').length
  }

  const chartData = {
    labels: ['Tamamlanan', 'Bekleyen'],
    datasets: [{
      data: [stats.completed, stats.total - stats.completed],
      backgroundColor: ['#48bb78', '#fc8181'],
      borderColor: ['#38a169', '#f56565'],
      borderWidth: 1,
    }]
  }

  return (
    <div className="app-container">
      <div className="todo-container">
        <h1>Yapılacaklar Listesi</h1>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Görev ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="sort-container">
          <span className="sort-label">Görevleri Sırala</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="priority-high">Öncelik (Yüksek → Düşük)</option>
            <option value="priority-low">Öncelik (Düşük → Yüksek)</option>
            <option value="deadline">Yaklaşan Bitiş Tarihi</option>
            <option value="created">Son Eklenenler</option>
          </select>
        </div>

        <form onSubmit={handleSubmit} className="todo-form">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Yeni görev ekle..."
            className="todo-input"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="priority-select"
          >
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
          </select>
          <input
            type="datetime-local"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="deadline-input"
            min={minDateTime}
            step="1800"
          />
          <button type="submit" className="add-button">
            <span>Ekle</span>
            <span className="button-icon">+</span>
          </button>
        </form>

        <div className="filters">
          <button 
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tümü ({todos.length})
          </button>
          <button 
            className={`filter-button ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Aktif ({stats.total - stats.completed})
          </button>
          <button 
            className={`filter-button ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Tamamlanan ({stats.completed})
          </button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="todos">
            {(provided) => (
              <ul 
                className="todo-list"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {filteredAndSearchedTodos.map((todo, index) => (
                  <Draggable 
                    key={todo.id} 
                    draggableId={todo.id.toString()} 
                    index={index}
                  >
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`todo-item priority-${todo.priority} 
                          ${todo.completed ? 'completed' : ''} 
                          ${todo.deadline ? `deadline-${getDeadlineStatus(todo.deadline)}` : ''}`
                        }
                      >
                        {editingId === todo.id ? (
                          <div className="edit-form">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="edit-input"
                              autoFocus
                            />
                            <input
                              type="datetime-local"
                              value={editingDeadline}
                              onChange={(e) => setEditingDeadline(e.target.value)}
                              className="deadline-input"
                              min={minDateTime}
                              step="1800"
                            />
                            <select
                              value={editingPriority}
                              onChange={(e) => setEditingPriority(e.target.value)}
                              className="priority-select"
                            >
                              <option value="low">Düşük</option>
                              <option value="medium">Orta</option>
                              <option value="high">Yüksek</option>
                            </select>
                            <button onClick={() => saveEdit(todo.id)} className="save-button">
                              Kaydet
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="todo-content">
                              <div className="todo-main">
                                <input
                                  type="checkbox"
                                  checked={todo.completed}
                                  onChange={() => toggleTodo(todo.id)}
                                  className="todo-checkbox"
                                />
                                <span className="todo-text">{todo.text}</span>
                              </div>
                              {todo.deadline && (
                                <div className="todo-deadline">
                                  {formatDeadline(todo.deadline)}
                                </div>
                              )}
                            </div>
                            <div className="todo-actions">
                              <button onClick={() => startEditing(todo)} className="edit-button">
                                Düzenle
                              </button>
                              <button onClick={() => deleteTodo(todo.id)} className="delete-button">
                                Sil
                              </button>
                            </div>
                            <div className="priority-badge">
                              {todo.priority === 'high' && '🔴'}
                              {todo.priority === 'medium' && '🟡'}
                              {todo.priority === 'low' && '🟢'}
                            </div>
                          </>
                        )}
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>

        {todos.length > 0 && (
          <div className="stats-container">
            <div className="stats-text">
              <div>Toplam: {stats.total}</div>
              <div>Tamamlanan: {stats.completed}</div>
              <div>Yüksek Öncelikli: {stats.high}</div>
              <div>Orta Öncelikli: {stats.medium}</div>
              <div>Düşük Öncelikli: {stats.low}</div>
              <div>Geciken: {stats.overdue}</div>
            </div>
            <div className="stats-chart">
              <Pie data={chartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

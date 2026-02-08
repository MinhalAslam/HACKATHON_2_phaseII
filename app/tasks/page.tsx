"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TaskList from "@/components/TaskList";
import TaskForm from "@/components/TaskForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { apiClient } from "@/lib/api-client";

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getTasks();
      setTasks(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (title: string, description: string) => {
    try {
      await apiClient.createTask(title, description);
      await loadTasks();
      setShowCreateForm(false);
    } catch (err) {
      // Don't re-throw - let error bubble up naturally
      console.error('Create task error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const handleUpdateTask = async (title: string, description: string) => {
    if (!editingTask) return;

    try {
      await apiClient.updateTask(editingTask.id, title, description);
      await loadTasks();
      setEditingTask(null);
    } catch (err) {
      // Don't re-throw - let error bubble up naturally
      console.error('Update task error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleToggleComplete = async (id: string) => {
    try {
      await apiClient.toggleTaskComplete(id);
      await loadTasks();
    } catch (err) {
      console.error("Toggle complete error:", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await apiClient.deleteTask(id);
      await loadTasks();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/login");
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadTasks} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-grow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
              <p className="text-slate-600 mt-1">
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!showCreateForm && !editingTask && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 shadow-sm"
                >
                  New Task
                </button>
              )}

              <button
                onClick={handleLogout}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {showCreateForm && (
              <TaskForm
                mode="create"
                onSubmit={handleCreateTask}
                onCancel={() => setShowCreateForm(false)}
              />
            )}

            {editingTask && (
              <TaskForm
                mode="edit"
                initialTask={editingTask}
                onSubmit={handleUpdateTask}
                onCancel={() => setEditingTask(null)}
              />
            )}

            <TaskList
              tasks={tasks}
              onToggleComplete={handleToggleComplete}
              onEdit={setEditingTask}
              onDelete={handleDeleteTask}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

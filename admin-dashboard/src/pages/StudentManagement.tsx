import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  parent?: { id: string; name: string };
  bus?: { id: string; busNumber: string };
  stop?: { id: string; name: string };
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    parentId: '',
    busId: '',
    stopId: '',
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await api.get('/students');
      setStudents(response.data?.data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.parentId) delete (payload as any).parentId;
      if (!payload.busId) delete (payload as any).busId;
      if (!payload.stopId) delete (payload as any).stopId;

      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, payload);
      } else {
        await api.post('/students', payload);
      }
      setShowModal(false);
      setEditingStudent(null);
      setFormData({ name: '', rollNumber: '', parentId: '', busId: '', stopId: '' });
      loadStudents();
    } catch (error) {
      console.error('Error saving student:', error);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      rollNumber: student.rollNumber,
      parentId: student.parent?.id || '',
      busId: student.bus?.id || '',
      stopId: student.stop?.id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Student Management</h1>
        <button
          onClick={() => { setEditingStudent(null); setFormData({ name: '', rollNumber: '', parentId: '', busId: '', stopId: '' }); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Student
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stop</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-6 py-4 whitespace-nowrap">{student.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.rollNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.parent?.name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.bus?.busNumber || 'Not assigned'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.stop?.name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                  <button onClick={() => handleEdit(student)} className="text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && (
          <div className="p-6 text-center text-gray-500">No students found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingStudent ? 'Edit Student' : 'Add Student'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Roll Number</label>
                <input type="text" value={formData.rollNumber} onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Parent ID</label>
                <input type="text" value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="UUID of parent" required={!editingStudent} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bus ID (optional)</label>
                <input type="text" value={formData.busId} onChange={(e) => setFormData({ ...formData, busId: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="UUID of bus" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Stop ID (optional)</label>
                <input type="text" value={formData.stopId} onChange={(e) => setFormData({ ...formData, stopId: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="UUID of stop" />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;

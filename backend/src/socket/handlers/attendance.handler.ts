import { Socket } from 'socket.io';
import { markAttendance } from '../../modules/attendance/attendance.service';
import { verifyToken, AuthPayload } from '../../middleware/auth';

export const handleAttendanceEvents = (socket: Socket) => {
  socket.on('driver:student-boarding', async (data) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const decoded = verifyToken(token) as AuthPayload;
      if (decoded.userType !== 'DRIVER') {
        socket.emit('error', { message: 'Only drivers can mark attendance' });
        return;
      }

      const { studentId, tripId } = data;
      const markedBy = decoded.userId;

      const attendance = await markAttendance({
        studentId,
        tripId,
        type: 'BOARDING',
        markedBy,
      });

      socket.emit('attendance:marked', attendance);
    } catch (error: any) {
      console.error('Boarding attendance error:', error);
      socket.emit('error', { message: error.message || 'Failed to mark attendance' });
    }
  });

  socket.on('driver:student-drop', async (data) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const decoded = verifyToken(token) as AuthPayload;
      if (decoded.userType !== 'DRIVER') {
        socket.emit('error', { message: 'Only drivers can mark attendance' });
        return;
      }

      const { studentId, tripId } = data;
      const markedBy = decoded.userId;

      const attendance = await markAttendance({
        studentId,
        tripId,
        type: 'DROPOFF',
        markedBy,
      });

      socket.emit('attendance:marked', attendance);
    } catch (error: any) {
      console.error('Drop-off attendance error:', error);
      socket.emit('error', { message: error.message || 'Failed to mark attendance' });
    }
  });
};

export const handleEmergency = (socket: Socket) => {
  socket.on('driver:emergency', async (data) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const decoded = verifyToken(token) as AuthPayload;
      if (decoded.userType !== 'DRIVER') {
        socket.emit('error', { message: 'Only drivers can trigger emergency' });
        return;
      }

      const { tripId, message } = data;

      // Emit emergency alert to school admin
      socket.to(`school:${decoded.schoolId}`).emit('fleet:emergency-alert', {
        tripId,
        driverId: decoded.userId,
        message: message || 'Emergency triggered by driver',
        timestamp: new Date(),
      });

      socket.emit('emergency:acknowledged', { timestamp: new Date() });
    } catch (error: any) {
      console.error('Emergency error:', error);
      socket.emit('error', { message: error.message || 'Failed to trigger emergency' });
    }
  });

  socket.on('parent:emergency', async (data) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const decoded = verifyToken(token) as AuthPayload;
      if (decoded.userType !== 'PARENT') {
        socket.emit('error', { message: 'Only parents can trigger emergency' });
        return;
      }

      const { studentName, message } = data;

      socket.to(`school:${decoded.schoolId}`).emit('fleet:emergency-alert', {
        parentId: decoded.userId,
        studentName: studentName || 'a student',
        message: message || 'Emergency triggered by a parent',
        timestamp: new Date(),
      });

      socket.emit('emergency:acknowledged', { timestamp: new Date() });
    } catch (error: any) {
      console.error('Parent emergency error:', error);
      socket.emit('error', { message: error.message || 'Failed to trigger emergency' });
    }
  });
};

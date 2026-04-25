const nodemailer = require('nodemailer');
const { mail } = require('../config/env');
const dashboardCacheService = require('./dashboardCache.service');
const Student = require('../models/Student');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: mail.user,
        pass: mail.pass
    }
});

const sendProgressReport = async (studentId) => {
    try {
        const student = await Student.findById(studentId);
        if (!student) throw new Error('Student not found');

        const data = await dashboardCacheService.getDashboardData(studentId);

        const subjectRows = data.subjects_data.map(sub => `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${sub.subjectName}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${sub.chapters.length}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${Math.round(sub.chapters.reduce((acc, ch) => acc + ch.completionPercent, 0) / Math.max(1, sub.chapters.length))}%</td>
      </tr>
    `).join('');

        const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #F97316; text-align: center;">DrishtiVani Learning Report</h2>
        <p>Hello,</p>
        <p>Here is the learning progress report for <strong>${student.name}</strong> (Class ${student.class_num}).</p>
        
        <div style="background: #FFF8F3; padding: 15px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Overall Performance</h3>
          <p><strong>Total Completion:</strong> ${data.overall_completion}%</p>
          <p><strong>Average Quiz Score:</strong> ${data.overall_quiz_avg}%</p>
          <p><strong>Study Streak:</strong> ${data.study_streak_days} Days</p>
        </div>

        <h3>Subject Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8f8f8;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Subject</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Chapters</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Avg. Completion</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRows}
          </tbody>
        </table>

        <div style="margin-top: 30px; border-top: 2px solid #F97316; pt: 10px;">
          <p style="font-size: 14px; color: #666;"><strong>AI Insight:</strong> ${data.ai_insight}</p>
        </div>
        
        <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">Sent via DrishtiVani - AI for Accessible Education</p>
      </div>
    `;

        const mailOptions = {
            from: `"DrishtiVani" <${mail.user}>`,
            to: mail.reportEmail,
            subject: `Learning Report: ${student.name} (Class ${student.class_num})`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[EmailService] Report sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('[EmailService] Error:', error);
        throw error;
    }
};

module.exports = { sendProgressReport };

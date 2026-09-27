import ReportPagePlaceholder from "../components/ReportPagePlaceholder";

const StudentWiseAttendance = () => (
  <ReportPagePlaceholder
    categoryId="attendance"
    categoryLabel="Attendance"
    title="Student Wise Attendance"
    description="Attendance percentage and day-wise presence for each student."
    columns={["Student ID", "Student Name", "Class", "Present Days", "Absent Days", "Attendance %"]}
  />
);

export default StudentWiseAttendance;
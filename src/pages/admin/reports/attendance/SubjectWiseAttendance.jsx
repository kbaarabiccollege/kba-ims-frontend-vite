import ReportPagePlaceholder from "../components/ReportPagePlaceholder";

const SubjectWiseAttendance = () => (
  <ReportPagePlaceholder
    categoryId="attendance"
    categoryLabel="Attendance"
    title="Subject Wise Attendance"
    description="Classes held vs. classes attended, broken down by subject."
    columns={["Subject", "Class", "Classes Held", "Classes Attended", "Attendance %"]}
  />
);

export default SubjectWiseAttendance;
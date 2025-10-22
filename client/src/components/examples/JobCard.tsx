import JobCard from '../JobCard';

export default function JobCardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-4">
      <JobCard
        id="1"
        name="Johnson Residence"
        address="1234 Oak Street, Minneapolis, MN 55401"
        contractor="Acme HVAC Solutions"
        status="in-progress"
        inspectionType="Pre-Drywall Inspection"
        scheduledDate="Oct 23, 2025"
        completedItems={38}
        totalItems={52}
        onClick={() => console.log('Job clicked')}
      />
      <JobCard
        id="2"
        name="Smith Commercial"
        address="5678 Maple Ave, St. Paul, MN 55102"
        contractor="Professional Contractors Inc"
        status="pending"
        inspectionType="Final Inspection"
        scheduledDate="Oct 24, 2025"
        completedItems={0}
        totalItems={52}
        onClick={() => console.log('Job clicked')}
      />
      <JobCard
        id="3"
        name="Anderson Duplex"
        address="9012 Pine Road, Bloomington, MN 55420"
        contractor="Quality Build Co"
        status="completed"
        inspectionType="Pre-Drywall Inspection"
        scheduledDate="Oct 20, 2025"
        completedItems={52}
        totalItems={52}
        onClick={() => console.log('Job clicked')}
      />
    </div>
  );
}

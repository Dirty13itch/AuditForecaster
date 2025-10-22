import TopBar from '../TopBar';

export default function TopBarExample() {
  return (
    <>
      <TopBar 
        title="Energy Audit Pro"
        onMenuClick={() => console.log('Menu clicked')}
        isOnline={true}
      />
      <div className="mt-20 p-4">
        <p className="text-muted-foreground">Scroll down to see offline state...</p>
      </div>
      <div className="mt-8">
        <TopBar 
          title="Johnson Residence - Pre-Drywall"
          isOnline={false}
          pendingSync={3}
        />
      </div>
    </>
  );
}

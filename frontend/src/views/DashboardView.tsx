// DashboardView - map (60%) + summary cards sidebar (40%)

import { FeederMap } from '../components/map/FeederMap';
import { SummaryCards } from '../components/dashboard/SummaryCards';

export function DashboardView() {
  return (
    <div className="h-full grid grid-cols-[1fr_380px] gap-3">
      <FeederMap />
      <SummaryCards />
    </div>
  );
}

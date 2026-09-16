interface StatisticsDefinitionsProps {
  includeBattingAverage?: boolean;
  includeBowlingAverage?: boolean;
  includeBowlingStrikeRate?: boolean;
  includeRunRate?: boolean;
}

export function StatisticsDefinitions({
  includeBattingAverage = false,
  includeBowlingAverage = false,
  includeBowlingStrikeRate = false,
  includeRunRate = false,
}: StatisticsDefinitionsProps) {
  return (
    <details className="statistics-definitions">
      <summary>Statistic definitions</summary>
      <dl>
        <div>
          <dt>Strike rate (SR)</dt>
          <dd>Runs scored per 100 balls faced.</dd>
        </div>
        <div>
          <dt>Economy (Econ)</dt>
          <dd>Runs conceded per over.</dd>
        </div>
        {includeRunRate ? (
          <div>
            <dt>Run rate (RR)</dt>
            <dd>Runs scored per over.</dd>
          </div>
        ) : null}
        {includeBattingAverage ? (
          <div>
            <dt>Batting average (Avg)</dt>
            <dd>Runs scored per dismissal.</dd>
          </div>
        ) : null}
        {includeBowlingAverage ? (
          <div>
            <dt>Bowling average (Avg)</dt>
            <dd>Runs conceded per wicket.</dd>
          </div>
        ) : null}
        {includeBowlingStrikeRate ? (
          <div>
            <dt>Bowling strike rate</dt>
            <dd>Legal balls bowled per wicket.</dd>
          </div>
        ) : null}
        <div>
          <dt>*</dt>
          <dd>The batter was not out.</dd>
        </div>
        <div>
          <dt>—</dt>
          <dd>The value is undefined or not applicable.</dd>
        </div>
      </dl>
    </details>
  );
}

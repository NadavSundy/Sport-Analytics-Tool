# Change Bowling Stats

**User:** Anonymous  
**Created:** 9/13/2026 21:22:13  
**Updated:** 9/13/2026 21:23:01  
**Exported:** 9/14/2026 15:19:57  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aa6f7e4-9e18-83ea-a5fc-e23a475df35c](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aa6f7e4-9e18-83ea-a5fc-e23a475df35c)  

## Prompt:
9/13/2026, 9:22:34 PM

what cahnges and how cna i see the canges

[Attachment: Pasted markdown.md]

[Attachment: Pasted markdown (2).md]

## Response:
9/13/2026, 9:22:38 PM

> **Explaining the changes**
>
> I’m seeing bowling statistics expanded to include wides and no-balls across match and career aggregates. To verify them, open a player with bowling data, then check Career totals, Match history, and fixture bowling tables; values should appear as separate columns.
>
> **Explained the changes**
>
> 
>
> Worked for 10s

The merged PR **#530 / Issue #515** adds a **bowling extras breakdown** to player statistics. It does **not** add a new page; it adds **Wides** and **No-balls** to the existing bowling-statistics views. The PR changed 22 files and was merged into `main` as commit `72759e3754`. `Pasted markdown.md`

### What visibly changed

On player statistics you should now see:

```text
Bowling statistics

Runs conceded    ...
Wides            ...
No-balls         ...
Legal balls      ...
Overs            ...
Economy rate     ...
Wickets          ...
```

Those values now appear in three places:

- **Player career totals** - career-wide Wides and No-balls.
- **Player match history** - Wides and No-balls for an individual fixture.
- **Fixture/player statistics** - the player's bowling figures for that fixture.

The frontend change itself is very small: `StatisticsPages.tsx` now renders:

```tsx
<StatisticMetric label="Runs conceded" value={bowling.runsConceded} />
<StatisticMetric label="Wides" value={bowling.wides} />
<StatisticMetric label="No-balls" value={bowling.noBalls} />
<StatisticMetric label="Legal balls" value={bowling.legalBallsBowled} />
```

The backend/API does the actual calculation from delivery events. Wides and no-balls are charged to the bowler, while **byes, leg-byes and innings penalties are deliberately not charged to the bowler**. `Pasted markdown (2).md`

### How to see it in the app

First make sure you have the merged version:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

git checkout main
git pull origin main
git log -5 --oneline
```

You should see the merge corresponding to:

```text
72759e3754 Merge pull request 'feat(statistics): add bowling extras breakdown' (#530)
```

If you're checking the **deployed site**, wait for the `main` deployment to complete, then:

1. Open the public application.
2. Go to **Competitions**.
3. Open a competition/season with published cricket data.
4. Open a fixture.
5. Select/open a player who bowled.
6. Look under **Bowling statistics**.
7. You should now see **Wides** and **No-balls**.
8. Open that player's main overview as well; under **Career totals** and **Match history**, the same fields should appear.

The E2E test specifically verifies that the player overview displays `Wides` and `No-balls`, so the **player overview is probably the easiest place to verify the change visually**. `Pasted markdown.md`

If you want to inspect exactly what changed in Git locally, run:

```bash
git show --stat 72759e375405ed75376dcb0a98c444a592d7e755
```

For the actual merged diff:

```bash
git diff 72759e375405ed75376dcb0a98c444a592d7e755^1 \
         72759e375405ed75376dcb0a98c444a592d7e755
```

Or just the visible frontend change:

```bash
git diff 72759e3754^1 72759e3754 -- \
  apps/frontend/src/features/statistics/StatisticsPages.tsx
```

That last command is the quickest way to see **exactly what was added to the UI**.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)
import { RaidHubRouter } from "@/RaidHubRouter"
import { clanLeaderboardRoute } from "./clan"
import { leaderboardIndividualGlobalRoute } from "./individual/global"
import { leaderboardIndividualPantheonRoute } from "./individual/pantheon"
import { leaderboardIndividualRaidRoute } from "./individual/raid"
import { leaderboardTeamContestRoute } from "./team/contest"
import { leaderboardTeamFirstActivityVersionRoute } from "./team/first"

export const leaderboardRouter = new RaidHubRouter({
    routes: [
        {
            path: "/individual",
            route: new RaidHubRouter({
                routes: [
                    { path: "/global/:category", route: leaderboardIndividualGlobalRoute },
                    { path: "/raid/:raid/:category", route: leaderboardIndividualRaidRoute },
                    {
                        path: "/pantheon/:version/:category",
                        route: leaderboardIndividualPantheonRoute
                    }
                ]
            })
        },
        {
            path: "/team",
            route: new RaidHubRouter({
                routes: [
                    {
                        path: "/first/:activity/:version",
                        route: leaderboardTeamFirstActivityVersionRoute
                    },
                    {
                        path: "/contest/:raid",
                        route: leaderboardTeamContestRoute
                    }
                ]
            })
        },
        {
            path: "/clan",
            route: clanLeaderboardRoute
        }
    ]
})

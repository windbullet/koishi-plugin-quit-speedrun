import { Context, Schema } from 'koishi'

export const name = 'quit-speedrun'

export const inject = ["database"]

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export interface SpeedrunData {
  userId: string,
  userName: string,
  addedTime: number,
}

export interface speedrunRank {
  userId: string,
  userName: string,
  usedTime: number,
}

declare module 'koishi' {
  interface Tables {
    speedrunData: SpeedrunData
    speedrunRank: speedrunRank
  }
}

export function apply(ctx: Context) {
  extendTables(ctx)
  ctx.on("guild-member-added", async (session) => {
    let data = await ctx.database.get("speedrunData", {userId: session.event.user.id})
    if (data.length === 0) {
      await ctx.database.create("speedrunData", {userId: session.event.user.id, userName: session.username, addedTime: Date.now()})
    }
  })

  ctx.on("guild-member-removed", async (session) => {
    let data = await ctx.database.get("speedrunData", {userId: session.event.user.id})
    if (data.length !== 0) {
      await ctx.database.create("speedrunRank", {userId: session.event.user.id, userName: session.username, usedTime: Date.now() - data[0].addedTime})
    }
  })

  ctx.command("退群速度排行榜 [page:number]")
    .usage("可指定页数，默认为第一页，每页显示五人")
    .action(async ({session}, page) => {
      let data = await ctx.database
        .select("speedrunRank")
        .orderBy("usedTime", "asc")
        .limit(5)
        .offset((page - 1) * 5)
        .execute()
      let result = ""
      for (let i of data) {
        result += `${i.userName}(${i.userId.slice(0, 2)}***${i.userId.slice(-2)})\n退群耗时：${msToTime(i.usedTime)}\n\n`
      }
    })
}

function extendTables(ctx: Context) {
  ctx.model.extend("speedrunData", {
    userId: "text",
    userName: "text",
    addedTime: "unsigned",
  }, {primary: "userId", autoInc: false})

  ctx.model.extend("speedrunRank", {
    userId: "text",
    userName: "text",
    usedTime: "unsigned",
  }, {primary: "userId", autoInc: false})
}

function msToTime(ms) {
  let seconds = (ms / 1000).toFixed(1);
  let minutes = (ms / (1000 * 60)).toFixed(1);
  let hours = (ms / (1000 * 60 * 60)).toFixed(1);
  let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  if (+seconds < 60) return seconds + " 秒";
  else if (+minutes < 60) return minutes + " 分钟";
  else if (+hours < 24) return hours + " 小时";
  else return days + " 天"
}

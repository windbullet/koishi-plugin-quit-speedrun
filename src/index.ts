import { Context, Database, Schema, h } from 'koishi'

export const name = 'quit-speedrun'

export const usage = "更新日志：https://forum.koishi.xyz/t/topic/5904"

export const inject = ["database"]

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export interface SpeedrunData2 {
  id: number,
  guildId: string,
  userId: string,
  userName: string,
  addedTime: number,
}

export interface SpeedrunRank2 {
  id: number,
  guildId: string,
  userId: string,
  userName: string,
  usedTime: number,
}

declare module 'koishi' {
  interface Tables {
    speedrunData2: SpeedrunData2
    speedrunRank2: SpeedrunRank2
  }
}

export function apply(ctx: Context) {
  extendTables(ctx)
  ctx.on("guild-member-added", async (session) => {
    let data = await ctx.database.get("speedrunData2", {
      guildId: session.guildId,
      userId: session.event.user.id
    })

    if (data.length === 0) {
      await ctx.database.create("speedrunData2", {
        guildId: session.guildId, 
        userId: session.event.user.id, 
        userName: session.username, 
        addedTime: Date.now()
      })
    }
  })

  ctx.on("guild-member-removed", async (session) => {
    let data = await ctx.database.get("speedrunData2", {
      guildId: session.guildId, 
      userId: session.event.user.id
    })

    if (data.length !== 0) {
      await ctx.database.create("speedrunRank2", {
        guildId: session.guildId, 
        userId: session.event.user.id, 
        userName: session.username, 
        usedTime: Date.now() - data[0].addedTime
      })
    }
  })

  ctx.command("退群速度排行榜 [page:number]")
    .usage("可指定页数，默认为第一页，每页显示五人")
    .action(async ({session}, page) => {
      let data = await ctx.database
        .select("speedrunRank2")
        .where({guildId: session.guildId})
        .orderBy("usedTime", "asc")
        .limit(5)
        .offset((page - 1) * 5)
        .execute()
      let result = ""
      for (let i of data) {
        result += `${i.userName}(${i.userId.slice(0, 2)}***${i.userId.slice(-2)})\n退群耗时：${msToTime(i.usedTime)}\n\n`
      }
      return h.quote(session.event.message.id) + result
    })
}

function extendTables(ctx: Context) {
  ctx.model.extend("speedrunData2", {
    id: "unsigned",
    guildId: "string",
    userId: "text",
    userName: "text",
    addedTime: "unsigned",
  }, {primary: "id", autoInc: true})

  ctx.model.extend("speedrunRank2", {
    id: "unsigned",
    guildId: "string",
    userId: "text",
    userName: "text",
    usedTime: "unsigned",
  })
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

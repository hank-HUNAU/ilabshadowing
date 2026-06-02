#!/usr/bin/env python3
import re
import json

def parse_time(time_str):
    """解析 LRC 时间戳 [mm:ss.xx] → 秒"""
    match = re.match(r'\[(\d+):(\d+\.\d+)\]', time_str)
    if match:
        return round(int(match.group(1)) * 60 + float(match.group(2)), 2)
    return 0

def parse_lrc(lrc):
    """解析 LRC 文件返回 lines 数组"""
    lines = []
    for line in lrc.split('\n'):
        line = line.strip()
        if not line or line.startswith('[') and not re.match(r'\[\d+', line):
            continue
        
        match = re.match(r'(\[\d+:\d+\.\d+\])(.+)\|(.+)', line)
        if match:
            time_seconds = parse_time(match.group(1))
            lines.append({
                "time": time_seconds,
                "en": match.group(2).strip(),
                "cn": match.group(3).strip()
            })
    return lines

# 解析 Unit 4-4
unit4_lrc = """[ti:Unit 04-4 Culture]
[ar:]
[al:]
[by:Audio Aligner]

[00:07.01]Parks Around the World | 世界各地的公园
[00:09.37]A. Villa Borghese, Rome, Italy | A.意大利罗马 Borghese 别墅
[00:14.47]Villa Borghese is a big public park. | 博尔盖塞别墅（Villa Borghese）是一个大型公共公园
[00:19.19]There are beautiful gardens, trees and some fountains too. | 这里还有美丽的花园、树木和一些喷泉。
[00:25.50]People also call it the Park of Museums because there are many interesting museums there. | 人们也称之为博物馆公园，因为那里有许多有趣的博物馆。
[00:34.07]B. Golden Gate Park, San Francisco, the US. | B. 美国旧金山金门公园。
[00:40.78]Everyone knows the Golden Gate Bridge, | 大家都知道金门大桥，
[00:43.59]but did you know that there is the Golden Gate Park in San Francisco too? | 但您知道旧金山也有金门公园吗？
[00:49.92]It's very big, 4.8 kilometers long, almost 1 kilometer wide, | 它非常大，长 4.8 公里，宽近 1 公里，
[00:56.84]and at one end you can see the sea. | 一端可以看到大海
[01:01.82]C. Chapel Tepec Park, Mexico City, Mexico. | C.墨西哥墨西哥城 Chapel Tepec 公园。
[01:08.03]Chapel Tepec Park is an important green space in this big city. | 特佩克教堂公园（Chapel Tepec Park）是这座大城市的重要绿地。
[01:14.34]It has a lake and a hill with a castle on it. | 它有一个湖泊和一座山，上面有一座城堡。
[01:18.65]People in Mexico City love going there. | 墨西哥城的人们喜欢去那里。
[01:23.51]D. El Parque del Buen Retiro, Madrid, Spain. | D. El Parque del Buen Retiro，西班牙马德里。
[01:29.90]In Madrid there is a very big park called Buen Retiro. | 马德里有一个非常大的公园，名为 Buen Retiro。
[01:35.59]There are trees and paths and a lovely rose garden too. | 这里有树木和小径，还有一个可爱的玫瑰花园。
[01:41.37]There is also a beautiful glass palace. | 还有一座美丽的玻璃宫殿。
[01:46.62]E. The Iguana Park, Guayaquil, Ecuador. | E.鬣蜥公园，厄瓜多尔瓜亚基尔。
[01:52.51]The park's real name is Parque Seminario, | 公园的真名是 Parque Seminario，
[01:56.31]but everyone calls it the Iguana Park because it is full of iguanas. | 但每个人都称之为鬣蜥公园，因为它充满了鬣蜥。
[02:03.09]The iguanas are very friendly. | 鬣蜥非常友好。
[02:06.48]People go there and feed them. | 人们去那里喂它们。
[02:10.53]F. Mount Faber Park, Singapore. | F.新加坡 Mount Faber 公园。
[02:15.68]On a mountain near Singapore, there is a park called Mount Faber. | 在新加坡附近的一座山上，有一个名为 Mount Faber 的公园。
[02:21.47]You can get there by cable car. | 您可以乘坐缆车前往。
[02:25.18]In the park, you can walk on a long path or on an amazing bridge. | 在公园里，您可以在长途跋涉或令人惊叹的桥梁上漫步。
[02:31.56]You get a great view of the city. | 您可以欣赏到城市的美景。"""

# 解析 Unit 10-1
unit10_lrc = """[ti:Unit 10-1 Reading]
[ar:]
[al:]
[by:Audio Aligner]

[00:06.24]She was the first woman in space. | 第一位进入太空的女性
[00:10.16]Valentina Tereshkova was born in Russia on the 6th of March 1937. | 瓦伦蒂娜·捷列什科娃于 1937 年 3 月 6 日出生在俄罗斯。
[00:18.16]Her father was a driver, and her mother was a factory worker. | 她的父亲是一名司机，母亲是一名工厂工人。
[00:24.21]Valentina was a worker in a factory too. | 瓦伦蒂娜也是一家工厂的工人。
[00:28.51]Her hobby was skydiving, | 她的爱好是跳伞，
[00:30.96]and it was her dream to be an astronaut and to go into space. | 她的梦想是成为一名宇航员并进入太空。
[00:37.70]In 1962 there was a big competition to find new astronauts. | 1962 年，有一场寻找新宇航员的大型竞赛。
[00:44.89]There were 400 people interested in going to space. | 有 400 人有兴趣去太空。
[00:50.74]The training program wasn't very easy, | 培训计划并不容易，
[00:53.71]but Tereshkova was hard-working, | 但捷列什科娃很勤奋，
[00:56.84]and she was the lucky one. | 她是个幸运的人。
[01:00.89]Tereshkova's big day was the 16th of June 1963, | 捷列什科娃的大日子是 1963 年 6 月 16 日，
[01:06.64]and she was ready. | 她已经准备好了。
[01:10.17]The name of her spacecraft was Vostok-6, | 她的宇宙飞船的名字是东方 6 号，
[01:14.08]and Tereshkova was the first woman in space. | 捷列什科娃是第一位进入太空的女性
[01:19.14]The flight was very difficult because there were many technical problems, | 这次飞行非常困难，因为有很多技术问题，
[01:24.51]and Tereshkova wasn't very well for most of the flight. | 捷列什科娃在大部分航班上表现不佳
[01:29.84]She was in space for three days. | 她在太空中待了三天。
[01:33.48]She is the only woman to fly into space alone. | 她是唯一一个独自飞入太空的女性。
[01:38.90]After that she was very famous all over the world. | 从那以后，她在世界各地都很出名。
[01:44.34]Her face was on stamps in many countries. | 她的脸出现在许多国家的邮票上。
[01:48.98]In the year 2000 there was a big celebration in London, | 2000 年，伦敦举办了一场盛大的庆祝活动，
[01:54.51]and Valentina Tereshkova was named the woman of the century. | 瓦伦蒂娜·捷列什科娃被评为世纪女性。
[02:01.76]At the opening ceremony of the Winter Olympics in Russia in 2014, | 在 2014 年俄罗斯冬奥会开幕式上，
[02:07.53]Valentina Tereshkova was one of the carriers of the Olympic flag. | 瓦伦蒂娜·捷列什科娃是奥林匹克旗手。
[02:14.05]These were very important moments for her. | 这些对她来说是非常重要的时刻。"""

# 解析 LRC
unit4_lines = parse_lrc(unit4_lrc)
unit10_lines = parse_lrc(unit10_lrc)

print(f"✅ Unit 4-4: {len(unit4_lines)} 句")
print(f"✅ Unit 10-1: {len(unit10_lines)} 句")

# 读取 data.json
d = json.load(open('data.json', encoding='utf-8'))

# 更新 THINK_0
d['units']['THINK_0'] = [
    {
        "key": "u004",
        "title": "Unit 4-4 Culture",
        "audio": "Unit 04-4 Culture",
        "lines": unit4_lines
    },
    {
        "key": "u010",
        "title": "Unit 10-1 Reading",
        "audio": "Unit 10-1 Reading",
        "lines": unit10_lines
    },
    {
        "key": "u005",
        "title": "Unit 5-1 Robotics Club",
        "audio": "Unit 05-1 Reading A",
        "lines": []  # Unit 5-1 保留原来的数据
    }
]

# 写回 data.json
json.dump(d, open('data.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print("\n✅ data.json 已更新")

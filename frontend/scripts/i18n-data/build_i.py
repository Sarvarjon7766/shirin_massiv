import json,os
here=os.path.dirname(os.path.abspath(__file__))
I={
"Avval xaritada yo‘nalish chizing":("First draw a route on the map","Сначала нарисуйте маршрут на карте","请先在地图上绘制线路"),
"chap karta":("left card","карточка слева","左侧卡片"),
"Chizish orqali tahrirlash":("Edit by drawing","Править рисованием","通过绘制编辑"),
"Chizishni boshlash":("Start drawing","Начать рисование","开始绘制"),
"Fayl qo‘shish (PPTX, PDF, DOCX, XLSX)":("Add a file (PPTX, PDF, DOCX, XLSX)","Добавить файл (PPTX, PDF, DOCX, XLSX)","添加文件（PPTX、PDF、DOCX、XLSX）"),
"GeoJSON faylni tanlang":("Choose a GeoJSON file","Выберите файл GeoJSON","请选择 GeoJSON 文件"),
"Havola nusxalandi":("Link copied","Ссылка скопирована","链接已复制"),
"Havolani nusxalash":("Copy link","Скопировать ссылку","复制链接"),
"Obyektlarni almashtirish uchun yangi fayl tanlang; tanlamasangiz o‘zgarmaydi.":("Choose a new file to replace the objects; if you do not, nothing changes.","Выберите новый файл, чтобы заменить объекты; если не выбрать, ничего не изменится.","选择新文件以替换对象；不选择则保持不变。"),
"Parol yo‘q":("No password","Пароль не задан","未设置密码"),
"Polygon/MultiPolygon (zonalar), LineString (yo‘l, metro) yoki Point (obyektlar). Koordinatalar: longitude, latitude.":("Polygon/MultiPolygon (zones), LineString (road, metro) or Point (objects). Coordinates: longitude, latitude.","Polygon/MultiPolygon (зоны), LineString (дорога, метро) или Point (объекты). Координаты: долгота, широта.","Polygon/MultiPolygon（区域）、LineString（道路、地铁）或 Point（对象）。坐标：经度，纬度。"),
"Qatlamni tahrirlash":("Edit layer","Править слой","编辑图层"),
"Reja rasmini sozlash":("Adjust the master plan image","Настроить изображение генплана","调整总体规划图"),
"To‘xtatish":("Pause","Пауза","暂停"),
"Xaritada bor":("On the map","На карте","已在地图上"),
"Xaritada yo‘q":("Not on the map","Нет на карте","不在地图上"),
"Xaritani tahrirlash":("Edit map","Править карту","编辑地图"),
"Yangi qatlam":("New layer","Новый слой","新建图层"),
"Yangi reja rasmi":("New master plan image","Новое изображение генплана","新建总体规划图"),
}
out={k:{'en':a,'ru':b,'zh':c} for k,(a,b,c) in I.items()}
json.dump(out,open(os.path.join(here,'..','..','lib','locales','part-i.json'),'w',encoding='utf8'),ensure_ascii=False,indent=2)
print(len(out))
p=os.path.join(here,'..','..','lib','i18n.ts')
s=open(p,encoding='utf8',newline='').read()
if 'part-i' not in s:
    s=s.replace("import h from './locales/part-h.json';","import h from './locales/part-h.json';\nimport ii from './locales/part-i.json';",1)
    s=s.replace("...g,...h,...extra","...g,...h,...ii,...extra",1)
    open(p,'w',encoding='utf8',newline='').write(s)

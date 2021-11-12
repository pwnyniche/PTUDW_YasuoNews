const express = require("express");
const multer = require("multer");
const date = require("date-and-time");
const moment = require('moment');
const userModel = require("../models/user.model");
const newsModel = require("../models/news.model");
const cateModel = require("../models/category.model");
const tagModel = require("../models/tag.model");
const apiModel = require("../models/api.model");
const bcrypt = require("bcryptjs");
const fs = require("fs-extra");

const router = express.Router();

router.get("/", (req, res) => {
  res.redirect("/admin/manage/category");
});

router.get("/manage/category", async function (req, res) {
  const errors = req.flash("error");
  const success = req.flash("success");
  const mainCateList = await cateModel.findCategoryWithDetail();
  const subCateList = await cateModel.findSubCategoryWithDetail();

  res.render("adminView/category", {
    layout: "admin.hbs",
    title: "Admin | Quản lí chuyên mục",
    listCategory: mainCateList,
    listSubCategory: subCateList,
    errors: errors,
    hasError: errors.length > 0,
    success: success,
    hasSuccess: success.length > 0,
  });
});

router.get("/manage/post", async function (req, res) {
  const articles = await newsModel.all();
  const categories = await cateModel.allMainCate();
  const subCategories = await cateModel.all();
  const tags = await tagModel.all();
  const writers = await userModel.findWriter();
  const tagsOfArticle = await newsModel.getAllTagWithDetail();
  const errors = req.flash("error");
  const success = req.flash("success");

  res.render("adminView/post", {
    layout: "admin.hbs",
    title: "Admin | Quản lí bài viết",
    listArticle: articles,
    listCate: categories,
    listSubCate: subCategories,
    listTagOfArticle: tagsOfArticle,
    listTag: tags,
    listWriter: writers,
    errors: errors,
    hasError: errors.length > 0,
    success: success,
    hasSuccess: success.length > 0,
  });
});

router.get("/manage/post/add", async function (req, res) {
  const tags = await newsModel.LayDanhSachTag();
  const listSub = await newsModel.LayDanhSachChuyenMucPhu();

  res.render("adminView/post-add", {
    layout: "admin.hbs",
    title: "Admin | Thêm bài viết",
    topic: "Thêm bài viết",
    tags: tags,
    listSub: listSub,
    flag: false,
  });
});

router.get("/manage/post/update-content/:id", async function (req, res) {
  const idUser = +req.session.authUser.idNguoiDung;
  const idBaiBao = req.params.id;
  const tags = await newsModel.LayDanhSachTag();
  const listSub = await newsModel.LayDanhSachChuyenMucPhu();
  const article = await newsModel.ChiTietBaiVietVer2(idBaiBao);
  var rawNgayDang = await newsModel.layNgayDang(idBaiBao);
  NgayDang = moment(rawNgayDang,'YYYY-MM-DDTHH:mm:ss.SSS').format('DD/MM/YYYY HH:mm');
  let tagsOfNews = await newsModel.LayDanhSachTagCuaBaiViet(idBaiBao);
  let list = [];

  if (tagsOfNews[0].length !== 0) {
    for (let i = 0; i < tagsOfNews[0].length; i++) {
      list.push(tagsOfNews[0][i].idTag);
    }
  }

  if (article === null) {
    console.log("ID k ton tai?");
    req.flash("error", "Chỉnh sửa bài viết thất bại");
    res.redirect("/admin/manage/post");
  } else if (+article.idTacGia != +idUser) {
    req.flash("error", "Chỉnh sửa bài viết thất bại");
    res.redirect("/admin/manage/post");
  } else {
    res.render("adminView/post-add", {
      actionpost: "/admin/manage/post/edit",
      layout: "admin.hbs",
      title: "Admin | Chỉnh sửa bài viết",
      topic: "Chỉnh sửa bài viết",
      article,
      tags: tags,
      listSub: listSub,
      NgayDang: NgayDang,
      tagsOfNews: list,
      flag: true,
    });
  }
});

router.post("/manage/post/add", async function (req, res) {
  let AnhDaiDien = "";
  const idTacGia = +req.body.idTacGia;
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, "./public/img/BaiBao");
    },
    filename(req, file, cb) {
      AnhDaiDien = file.originalname;
      cb(null, file.originalname);
    },
  });
  const upload = multer({
    storage,
  });
  upload.single("file")(req, res, async function (err) {
    if (err) {
      console.log(err);
    } else {
      const now = new Date();
      const NgayCuoiChinhSua = date.format(now, "YYYY-MM-DD HH:mm:ss");
      const tagList = req.body.arrayOfTags;
      const TinhTrangDuyet = req.body.TinhTrangDuyet;
      const NgayDang = moment(req.body.NgayDang, 'DD/MM/YYYYTHH:mm').format('YYYY-MM-DD HH:mm:ss');
      delete req.body.arrayOfTags;
      delete req.body.NgayDang;
      let baibao = req.body;
      delete baibao.idBaiBao;
      baibao = Object.assign(
        {
          idTacGia,
          AnhDaiDien,
          NgayCuoiChinhSua,
          TinhTrangDuyet,
        },
        baibao
      );
      const result = await newsModel.ThemBaiViet(baibao);

      if (TinhTrangDuyet === "Đã xuất bản" || TinhTrangDuyet === "Đã duyệt - Chờ xuất bản")
        await newsModel.themVaoBaiXuatBan(result, TinhTrangDuyet, NgayDang);

      var oldPath = "public\\img\\BaiBao\\" + AnhDaiDien;
      var newPath = "public\\img\\BaiBao\\" + result + "\\" + AnhDaiDien;

      fs.move(oldPath, newPath, function (err) {
        if (err) return console.error(err);
        console.log("success move file!");
      });

      if (result === null) {
        req.flash("error", "Thêm bài viết thất bại");
        res.redirect("/admin/manage/post");
      }

      const id = +result[0];
      if (typeof tagList === "string") {
        await newsModel.ThemTagBaiViet(id, +tagList);
      } else {
        for (let index = 0; index < tagList.length; ++index) {
          const result2 = await newsModel.ThemTagBaiViet(id, tagList[index]);
        }
      }
      req.flash("success", "Thêm bài viết thành công");
      res.redirect("/admin/manage/post");
    }
  });
});

router.post("/manage/post/edit", async function (req, res) {
  let AnhDaiDien = "";
  const idTacGia = req.session.authUser.idNguoiDung;
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, "./public/img/BaiBao");
    },
    filename(req, file, cb) {
      AnhDaiDien = file.originalname;
      if (AnhDaiDien == "") {
        AnhDaiDien = "no-image.png";
      }
      cb(null, file.originalname);
    },
  });
  const upload = multer({
    storage,
  });
  upload.single("file")(req, res, async function (err) {
    if (err) {
      console.log(err);
    } else {
      const oldAvatar = req.body.oldAvatar;
      delete req.body.oldAvatar;
      const now = new Date();
      const NgayCuoiChinhSua = date.format(now, "YYYY-MM-DD HH:mm:ss");
      const tagList = req.body.arrayOfTags;
      const TinhTrangDuyet = req.body.TinhTrangDuyet;
      const NgayDang = moment(req.body.NgayDang, 'DD/MM/YYYYTHH:mm').format('YYYY-MM-DD HH:mm:ss');
      delete req.body.arrayOfTags;
      delete req.body.NgayDang;
      const id = req.body.idBaiBao;
      let baibao = req.body;
      if (AnhDaiDien === "") {
        AnhDaiDien = oldAvatar;
      } else {
        var oldPath = "public\\img\\BaiBao\\" + AnhDaiDien;
        var newPath = "public\\img\\BaiBao\\" + id + "\\" + AnhDaiDien;

        fs.move(oldPath, newPath, function (err) {
          if (err) return console.error(err);
        });
      }
      baibao = Object.assign(
        {
          AnhDaiDien,
          NgayCuoiChinhSua,
          TinhTrangDuyet,
          LyDoTuChoi: "",
        },
        baibao
      );

      const result = await newsModel.UpdateBaiViet(id, baibao);
      const delres = await newsModel.XoaTagBaiViet(id);
      if (TinhTrangDuyet === "Đã xuất bản" || TinhTrangDuyet === "Đã duyệt - Chờ xuất bản")
        await newsModel.themVaoBaiXuatBan(id, TinhTrangDuyet, NgayDang);

      if (result === null) {
        console.log("K the update bai");
        req.flash("error", "Chỉnh sửa bài viết thất bại");
        res.redirect("/admin/manage/post");
      }

      if (typeof tagList === "string") {
        await newsModel.ThemTagBaiViet(id, +tagList);
      } else {
        for (let index = 0; index < tagList.length; ++index) {
          const result2 = await newsModel.ThemTagBaiViet(id, tagList[index]);
        }
      }

      req.flash("success", "Chỉnh sửa bài viết thành công");
      res.redirect("/admin/manage/post");
    }
  });
});

router.get("/manage/post/content/:id", async function (req, res) {
  const id = +req.params.id;
  const details = await newsModel.getDetailOfPostForAdmin(id);
  const comment = await newsModel.getCommentOfArticle(id);
  const subCateList = await cateModel.allSubCate();
  const tags = await tagModel.all();
  const rawNgayDang = await newsModel.layNgayDang(id);
  const NgayDang = moment(rawNgayDang,'YYYY-MM-DDTHH:mm:ss.SSS').format('DD/MM/YYYY HH:mm');
  const tagsOfArticle = await newsModel.getAllTagWithDetail();
  var canUpdate = false;

  if (
    +req.session.authUser.idNguoiDung === +details.idTacGia &&
    details.TinhTrangDuyet != "Đã xuất bản"
  )
    canUpdate = true;

  res.render("adminView/post-detail", {
    layout: "admin.hbs",
    title: "Admin | Quản lí bài viết",
    article: details,
    comments: comment,
    listSubCate: subCateList,
    listTagOfArticle: tagsOfArticle,
    listTag: tags,
    NgayDang: NgayDang,
    flag: canUpdate,
  });
});

router.post("/manage/post/del", async function (req, res) {
  const id = req.body.id;
  if (typeof id !== "undefined") {
    const result = await newsModel.del(id);
    if (result) {
      req.flash("success", "Xóa bài viết thành công");
    } else {
      req.flash("error", "Xóa bài viết thất bại");
    }
  }
  res.redirect("/admin/manage/post/");
});

router.post("/manage/post/delCom", async function (req, res) {
  const id = req.body.id;
  const url = req.headers.referer || "/admin/manage/post/";
  if (typeof id !== "undefined") {
    const result = await newsModel.delCom(id);
    if (result) {
      req.flash("success", "Xóa bình luận thành công");
    } else {
      req.flash("error", "Xóa bình luận thất bại");
    }
  }
  res.redirect(url);
});

router.post("/manage/post/update", async function (req, res) {
  const id = req.body.postID;
  const subID = req.body.subID;
  const status = req.body.newStatus;
  const NgayDang = moment(req.body.NgayDang, 'DD/MM/YYYYTHH:mm').format('YYYY-MM-DD HH:mm:ss');
  const url = req.headers.referer || "/admin/manage/post/";
  if (typeof id !== "undefined") {
    const result = await newsModel.updatePost(id, subID, status, NgayDang);
    if (result) {
      req.flash("success", "Cập nhật bài viết thành công");
    } else {
      req.flash("error", "Cập nhật bài viết thất bại");
    }
  }
  res.redirect(url);
});

router.get("/manage/tag", async function (req, res) {
  const list = await tagModel.allWithDetail();
  const errors = req.flash("error");
  const success = req.flash("success");

  res.render("adminView/tag", {
    layout: "admin.hbs",
    title: "Admin | Quản lí nhãn tag",
    tagList: list,
    errors: errors,
    hasError: errors.length > 0,
    success: success,
    hasSuccess: success.length > 0,
  });
});

router.post("/manage/tag/delTag", async function (req, res) {
  if (typeof req.body.id !== "undefined") {
    const result = await tagModel.delTag(req.body.id);
    if (result) {
      req.flash("success", "Xóa tag thành công");
    } else {
      req.flash("error", "Xóa tag thất bại");
    }
  }
  res.redirect("/admin/manage/tag");
});

router.post("/manage/tag/rename", async function (req, res) {
  if (typeof req.body.id !== "undefined") {
    const result = await tagModel.patch(
      "idTag",
      req.body.id,
      "tag",
      "TenTag",
      req.body.newTagName
    );
    if (result) {
      req.flash("success", "Sửa tên tag thành công");
    } else {
      req.flash("error", "Sửa tên tag thất bại");
    }
  }

  res.redirect("/admin/manage/tag");
});

router.post("/manage/tag/add", async function (req, res) {
  if (typeof req.body.newTag !== "undefined")
    tag = {
      TenTag: req.body.newTag,
    };
  const result = await tagModel.add(tag, "tag");
  if (result) {
    req.flash("success", "Thêm tag thành công");
  } else {
    req.flash("error", "Thêm tag thất bại");
  }
  res.redirect("/admin/manage/tag");
});

router.get("/manage/user", async function (req, res) {
  const list = await userModel.all();
  const errors = req.flash("error");
  const success = req.flash("success");

  res.render("adminView/user-general", {
    layout: "admin.hbs",
    title: "Admin | Quản lí người dùng",
    userList: list,
    errors: errors,
    hasError: errors.length > 0,
    success: success,
    hasSuccess: success.length > 0,
  });
});

router.get("/manage/user/add", async function (req, res) {
  const catelist = await cateModel.findNonAssignedCate();

  res.render("adminView/user-add", {
    layout: "admin.hbs",
    title: "Admin | Thêm người dùng",
    cateList: catelist,
  });
});

router.post("/manage/user/add", async function (req, res) {
  const hash = bcrypt.hashSync(req.body.password, 10);
  const dob = req.body.dob + " 00:00:00";
  const cateID = req.body.idcate;
  const user = {
    HoTen: req.body.fullname,
    NgaySinh: dob,
    GioiTinh: req.body.gender,
    Email: req.body.email,
    TenDangNhap: req.body.username,
    MatKhau: hash,
    LoaiNguoiDung: req.body.role,
    avatar: "/img/default-avatar.png",
    TinhTrang: 1,
  };

  const url = req.session.retUrl || "/admin/manage/user";
  const result = await userModel.addUserWithDetail(user, cateID);
  if (result) {
    req.flash("success", "Thêm người dùng thành công");
  } else {
    req.flash("error", "Thêm người dùng thất bại");
  }
  res.redirect(url);
});

router.get("/manage/user/guest", async function (req, res) {
  const list = await userModel.findByUserType("guest");
  const errors = req.flash("error");
  const success = req.flash("success");

  res.render("adminView/user-guest", {
    layout: "admin.hbs",
    title: "Admin | Quản lí người dùng độc giả vãng lai",
    userList: list,
    errors: errors,
    hasError: errors.length > 0,
    success: success,
    hasSuccess: success.length > 0,
  });
});

router.get("/manage/user/subscriber", async function (req, res) {
  const userlist = await userModel.findSubscriberWithDetail();
  const errors = req.flash("error");
  const success = req.flash("success");

  res.render("adminView/user-subscriber", {
    layout: "admin.hbs",
    title: "Admin | Quản lí độc giả vip",
    userList: userlist,
    errors: errors,
    hasError: errors.length > 0,
    success: success,
    hasSuccess: success.length > 0,
  });
});

router.get("/manage/user/writer", async function (req, res) {
  const userlist = await userModel.findWriterWithDetail();
  const errors = req.flash("error");
  const success = req.flash("success");

  res.render("adminView/user-writer", {
    layout: "admin.hbs",
    title: "Admin | Quản lí người dùng biên tập viên",
    userList: userlist,
    errors: errors,
    hasError: errors.length > 0,
    success: success,
    hasSuccess: success.length > 0,
  });
});

router.get("/manage/user/editor", async function (req, res) {
  const userlist = await userModel.findEditorWithDetail();
  const catelist = await cateModel.findNonAssignedCate();
  const errors = req.flash("error");
  const success = req.flash("success");

  res.render("adminView/user-editor", {
    layout: "admin.hbs",
    title: "Admin | Quản lí người dùng biên tập viên",
    userList: userlist,
    cateList: catelist,
    errors: errors,
    hasError: errors.length > 0,
    success: success,
    hasSuccess: success.length > 0,
  });
});

router.post("/manage/category/delMain", async function (req, res) {
  if (typeof req.body.id !== "undefined") {
    const result = await cateModel.delMainCate(+req.body.id);
    if (result) {
      req.flash("success", "Xóa chuyên mục chính thành công");
    } else {
      req.flash("error", "Xóa chuyên mục chính thắt bại");
    }
  }
  res.redirect("/admin/manage/category");
});

router.post("/manage/category/delSub", async function (req, res) {
  if (typeof req.body.id !== "undefined") {
    const result = await cateModel.delSubCate(+req.body.id);
    if (result) {
      req.flash("success", "Xóa chuyên mục phụ thành công");
    } else {
      req.flash("error", "Xóa chuyên mục phụ thất bại");
    }
  }

  res.redirect("/admin/manage/category");
});

router.post("/manage/category/renameMain", async function (req, res) {
  if (typeof req.body.id !== "undefined") {
    const row = {
      id: req.body.id,
      TenChuyenMuc: req.body.name,
    };
    const result = await cateModel.patchRow(
      row,
      "idChuyenMucChinh",
      "chuyenmucchinh"
    );
    if (result) {
      req.flash("success", "Đổi tên chuyên mục thành công");
    } else {
      req.flash("error", "Đổi tên chuyên mục thất bại");
    }
  }
  res.redirect("/admin/manage/category");
});

router.post("/manage/category/patchSub", async function (req, res) {
  if (typeof req.body.id !== "undefined") {
    const row = {
      id: req.body.id,
      TenChuyenMucPhu: req.body.name,
      idChuyenMucChinh: req.body.parentID,
    };
    const result = await cateModel.patchRow(
      row,
      "idChuyenMucPhu",
      "chuyenmucphu"
    );
    if (result) {
      req.flash("success", "Chỉnh sửa chuyên mục phụ thành công");
    } else {
      req.flash("error", "Chỉnh sửa chuyên mục phụ thất bại");
    }
  }
  res.redirect("/admin/manage/category");
});

router.post("/manage/category/addMain", async function (req, res) {
  const row = {
    TenChuyenMuc: req.body.name,
  };
  const result = await cateModel.add(row, "chuyenmucchinh");
  if (result) {
    req.flash("success", "Thêm chuyên mục thành công");
  } else {
    req.flash("error", "Thêm chuyên mục thất bại");
  }
  res.redirect("/admin/manage/category");
});

router.post("/manage/category/addSub", async function (req, res) {
  const row = {
    TenChuyenMucPhu: req.body.name,
    idChuyenMucChinh: +req.body.newSubCate_parent,
  };
  const result = await cateModel.add(row, "chuyenmucphu");
  if (result) {
    req.flash("success", "Thêm chuyên mục phụ thành công");
  } else {
    req.flash("error", "Thêm chuyên mục phụ thất bại");
  }
  res.redirect("/admin/manage/category");
});

router.post("/manage/user/delUser", async function (req, res) {
  if (typeof req.body.id !== "undefined") {
    const result = await userModel.delUser(+req.body.id, req.body.type);
    if (result) {
      req.flash("success", "Xóa người dùng thành công");
    } else {
      req.flash("error", "Xóa người dùng thất bại");
    }
  }

  res.redirect("/admin/manage/user");
});

router.post("/manage/user/patchRole", async function (req, res) {
  if (typeof req.body.id !== "undefined") {
    const result = await userModel.patchRole(
      req.body.id,
      req.body.role,
      req.body.oldrole
    );
    if (result) {
      req.flash("success", "Thay đổi vai trò người dùng thành công");
    } else {
      req.flash("error", "Thay đổi vai trò người dùng thất bại");
    }
  }

  res.redirect("/admin/manage/user");
});

router.post("/manage/user/renewal", async function (req, res) {
  if (typeof req.body.id !== "undefined") {
    const result = await userModel.renewSubs(req.body.id);
    if (result) {
      req.flash("success", "Gia hạn người dùng thành công");
    } else {
      req.flash("error", "Gia hạn người dùng thất bại");
    }
  }

  res.redirect("/admin/manage/user/subscriber");
});

router.post("/manage/user/assignCate", async function (req, res) {
  if (typeof req.body.ideditor !== "undefined") {
    row = {
      idBTV: req.body.ideditor,
      idChuyenMucChinh: req.body.idcate,
    };

    const result = await userModel.assignCate(row);

    if (result) {
      req.flash("success", "Phân công chuyên mục thành công");
    } else {
      req.flash("error", "Phân công chuyên mục thất bại");
    }
  }
  res.redirect("/admin/manage/user/editor");
});

router.get("/manage/user/profile/:id", async function (req, res) {
  const userId = +req.params.id || 0;
  result = await userModel.findUserWithDetail(userId);
  const url = req.headers.referer || "/";

  res.render("adminView/user-profile", {
    layout: "admin.hbs",
    title: "Admin | Thông tin người dùng",
    user: result,
    backurl: url,
  });
});

router.get("/manage/script", async (req, res)=>{
  const apis = await apiModel.load();

  res.render("adminView/webscraping.hbs", {
    layout: "admin.hbs",
    title: "Admin | Lấy tin tức",
    listAPI: apis
  });
});

router.post("/manage/script/add", async (req, res)=>{
  const api_link = req.body.apiLink;
  const script_name = req.body.scriptName;

  await apiModel.addAPI(script_name, api_link);

  res.redirect("/admin/manage/script");
});

router.post("/manage/script/del", async (req, res)=>{
  const idVal = req.body.id;
  await apiModel.deleteAPI(idVal);
  res.redirect("/admin/manage/script");
});

module.exports = router;

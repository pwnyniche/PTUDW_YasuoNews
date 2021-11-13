//Xử lý xóa tag
$(document).on("click", ".delTagConfirm", function () {
  const id = $(this).data("id");
  const tenTag = $(this).data("content");
  $("#deleteTagModal #content").text(
    "Bạn có chắc muốn xóa tag " + tenTag + "?"
  );
  $("#deleteTagModal #del").attr("value", id);
});

//Xử lý đổi tên tag
$(document).on("click", ".patchTagName", function () {
  const id = $(this).data("id");
  const tenTag = $(this).data("content");
  $("#renameTagModal #tagName").val(tenTag);
  $("#renameTagModal #idTag").attr("value", id);
});

$(document).on("click", ".deleteCateConfirm", function () {
  const id = $(this).data("id");
  const tenCate = $(this).data("title");
  $("#deleteTagModal #content").text(
    "Bạn có chắc muốn xóa chuyên mục " + tenCate + "?"
  );
  $("#deleteTagModal #del").attr("value", id);
});

$("#cate-filter").on("click", function (e) {
  var value = $("#type-cate option:selected").text();
  if (value === "Tất cả chuyên mục") value = "";
  $("tbody tr").filter(function () {
    $(this).toggle($(this).text().indexOf(value) > -1);
  });
});

$(document).on("click", ".deleteMainCateConfirm", function () {
  const id = $(this).data("id");
  const tenCate = $(this).data("title");
  const soCon = $(this).data("content");

  $("#deleteMainCategory #idCateDel").attr("value", id);
  $("#deleteMainCategory #so").attr("value", soCon);
  $("#deleteMainCategory #delContent").text(
    "Bạn có chắc muốn xóa chuyên mục " + tenCate + "?"
  );
});

$("#frmDelMain").on("submit", function (e) {
  const soCon = $("#frmDelMain #so").val();
  if (+soCon != 0) {
    e.preventDefault();
    $("#deleteMainCategory #delContent").text(
      "Không thể thực hiện. Vui lòng xóa hoặc đổi chuyên mục cha cho các chuyên mục con!"
    );
  }
});

$(document).on("click", ".deleteSubCateConfirm", function () {
  const id = $(this).data("id");
  const tenCate = $(this).data("title");
  const soBai = $(this).data("content");

  $("#deleteSubCategory #idCateDel").attr("value", id);
  $("#deleteSubCategory #so").attr("value", soBai);
  $("#deleteSubCategory #delContent").text(
    "Bạn có chắc muốn xóa chuyên mục " + tenCate + "?"
  );
});

$("#frmDelSub").on("submit", function (e) {
  const soBai = $("#deleteSubCategory #so").val();
  if (+soBai != 0) {
    e.preventDefault();
    $("#deleteSubCategory #delContent").text(
      "Không thể thực hiện. Vui lòng xóa hoặc đổi chuyên mục cho các bài báo!"
    );
  }
});

$(document).on("click", ".renameMainCateConfirm", function () {
  const id = $(this).data("id");
  const tenCate = $(this).data("title");

  $("#renameMainCategory #mainCateID").attr("value", id);
  $("#renameMainCategory #newMainCateName").val(tenCate);
});

$(document).on("click", ".delComConfirm", function () {
  const id = $(this).data("id");
  const user = $(this).data("content");

  $("#delCommentModal #content").text(
    "Bạn có chắc muốn xóa bình luận của " + user + "?"
  );
  $("#formDelCom #comID").attr("value", id);
});

$(document).on("click", ".updateSubConfirm", function () {
  const id = $(this).data("id");
  const tenCate = $(this).data("title");
  const tenCha = $(this).data("content");

  $("#updateSubCategory #subCateID").attr("value", id);
  $("#updateSubCategory #newSubCateName").val(tenCate);
  $(`#updateSubCategory #subCate_parent option:contains(${tenCha})`).attr(
    "selected",
    true
  );
});

$("#btn-post-filter").on("click", function (e) {
  var cate = $("#post-filter #cate").val();
  var tag = $("#post-filter #tag").val();
  var writer = $("#post-filter #writer").val();
  var status = $("#post-filter #status option:selected").text();
  console.log(status);
  if (cate === "Tất cả chuyên mục") cate = "";
  if (tag === "Tất cả thẻ tag") tag = "";
  if (status === "Tất cả trạng thái") status = "";
  if (writer === "Tất cả tác giả") writer = "";
  $("tbody tr").filter(function () {
    $(this).toggle(
      $(this).text().indexOf(cate) > -1 &&
        $(this).text().indexOf(tag) > -1 &&
        $(this).text().indexOf(writer) > -1 &&
        $(this).text().indexOf(status) > -1
    );
  });
});

$("#frmUpdatePost").on("change", function () {
  $(this).data("changed", true);
});

$("#frmUpdatePost").on("submit", function (e) {
  if (!$(this).data("changed")) {
    e.preventDefault();
  }
});

$(document).on("click", "#del-script-btn", () => {
  const id = $("#website-news option:selected").data("foo");
  console.log(id);
  const name = $("#website-news option:selected").text();
  $("#del-script-modal #del").attr("value", id);
  let text =
    name === "Chọn trang"
      ? "Vui lòng chọn một trang tin!"
      : `Bạn có chắc muốn xoá script lấy tin từ ${name}?`;
  $("#del-script-modal #content").text(text);
});

$(document).on("click", "#run-script-btn", () => {
  const name = $("#website-news option:selected").text();
  let text =
    name === "Chọn trang"
      ? "Vui lòng chọn một trang tin!"
      : `Bạn muốn chạy script lấy tin từ ${name}?`;
  $("#run-script-modal #content").text(text);
});

$(document).on("click", "#run-script-modal #run-confirm", () => {
  const name = $("#website-news option:selected").text();
  if (name === "Chọn trang") {
    $("#run-script-modal #content").text("Vui lòng chọn một trang tin tuc.");
  }
  else {
    const link = $("#website-news option:selected").val();
    $("#run-script-modal #content").text("Vui lòng chờ giây lát...");
    $.ajax({
      method: "GET",
      dataType: "json",
      url: link,
      contentType: "application/json",
      success: function (data, status, xhr) {
        console.log(data);
        if(data=='undefined'||data==null||data==false){
          $("#run-script-modal #content").text("Chạy thất bại!");
        }
        else{
          $("#run-script-modal #content").text("Chạy thành công!");
        }
      },
      error: function( jqXHR,textStatus, errorThrown){
        $("#run-script-modal #content").text("Chạy thất bại!");
      }
    });
  }
});

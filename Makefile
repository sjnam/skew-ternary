# 비스듬한 삼진 나무 빌드용 Makefile.
#
#   make            # tangle + 실행 파일 + 문서 조판
#   make tangle     # skew-ternary-calc.w -> skew-ternary-calc.go
#   make doc        # skew-ternary-calc.pdf 조판 (한글이라 luatex)
#   make run        # 크누스의 보기 나무로 한 번 돌려 본다
#   make app        # app/index.html 을 기본 브라우저로 연다
#   make clean      # 생성물 삭제 (.w/.mp 원본과 app/ 은 남긴다)
#
# 그림 예순여덟 장은 skew-ternary-calc.mp 에 fig_... 라는 이름으로 들어 있고,
# 조판하는 동안 luamplib 이 직접 그린다. mpost 를 따로 부를 일이 없다.
# 매크로(gwebmac.tex, kotexgweb.tex)는 설치된 texmf 트리에서 자동으로 찾는다.

GTANGLE ?= gtangle
GWEAVE  ?= gweave
LUATEX  ?= luatex

NAME := skew-ternary-calc

.PHONY: all tangle doc run app clean
.DEFAULT_GOAL := all

all: $(NAME) doc

tangle: $(NAME).go

$(NAME).go: $(NAME).w types.w
	$(GTANGLE) $(NAME).w

$(NAME): $(NAME).go
	go build -o $(NAME)

doc: $(NAME).pdf

$(NAME).pdf: $(NAME).w $(NAME).mp types.w
	$(GWEAVE) $(NAME).w && $(LUATEX) $(NAME).tex </dev/null

run: $(NAME)
	./$(NAME) A-BD B--C C--- DE-F E--- F---

app:
	open app/index.html

clean:
	rm -f $(NAME) $(NAME).go
	rm -f $(NAME).tex $(NAME).log $(NAME).toc $(NAME).scn $(NAME).idx

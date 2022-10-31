class A {
    // '#' 定义私有变量
    #age;

    // 为类声明静态属性
    static staticA;

    constructor(){
    }

    // 通过this访问类的static属性
    static getStaticA(){
        return this.staticA;
    }
}
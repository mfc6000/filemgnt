
# 🐧 在 WSL 中使用 XTSL China VPN 和 12VPX VPN 的代理配置指南

本指南解决的问题：  
- **XTSL China VPN**：应用代理型 VPN，在 Windows 本机 `127.0.0.1` 上开代理端口。  
- **12VPX VPN**：全隧道 VPN，通过虚拟网卡修改路由表，所有流量走 VPN。  
- Windows 浏览器能访问外网，因为它跟随系统代理或路由。  
- **WSL 默认 NAT 出口不会自动跟随 VPN** → 需要额外设置。  

---

## 1️⃣ 确认 Windows 本地代理端口 (XTSL China)

在 Windows **PowerShell** 执行：

```powershell
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' |
  Select ProxyEnable, ProxyServer, AutoConfigURL
```

输出示例：

```
ProxyEnable : 1
ProxyServer : http=127.0.0.1:16006;https=127.0.0.1:16006;socks=127.0.0.1:16005
```

👉 说明：  
- HTTP/HTTPS → `127.0.0.1:16006`  
- SOCKS5 → `127.0.0.1:16005`  

验证代理是否可用：

```powershell
curl -v --proxy http://127.0.0.1:16006 https://httpbin.org/ip
curl -v --proxy socks5://127.0.0.1:16005 https://httpbin.org/ip
```

---

## 2️⃣ Windows 建立 PortProxy 转发 (XTSL China)

因为 **WSL 无法直接访问 127.0.0.1**，需要用 `netsh portproxy` 转发到 `0.0.0.0`。

```powershell
# 转发 HTTP/HTTPS 到 7890
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=7890 connectaddress=127.0.0.1 connectport=16006

# 转发 SOCKS5 到 7891
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=7891 connectaddress=127.0.0.1 connectport=16005

# 放行防火墙
netsh advfirewall firewall add rule name="WSL Proxy Bridge 7890" dir=in action=allow protocol=TCP localport=7890
netsh advfirewall firewall add rule name="WSL Proxy Bridge 7891" dir=in action=allow protocol=TCP localport=7891
```

验证：

```powershell
netsh interface portproxy show all
```

输出示例：

```
监听地址     监听端口  连接地址     连接端口
----------- -------   ----------- -------
0.0.0.0     7890      127.0.0.1   16006
0.0.0.0     7891      127.0.0.1   16005
```

---

## 3️⃣ 在 WSL 设置代理环境变量 (XTSL China)

编辑 `~/.bashrc` 或 `~/.zshrc`：

```bash
HOST_IP=$(ip route | grep default | awk '{print $3}')

# HTTP/HTTPS
export http_proxy="http://$HOST_IP:7890"
export https_proxy="$http_proxy"

# SOCKS5
export all_proxy="socks5://$HOST_IP:7891"

# 内网直连
export no_proxy="localhost,127.0.0.1,.local,.corp,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

生效：

```bash
source ~/.bashrc
```

验证：

```bash
curl -I https://github.com
curl -v --proxy socks5://$HOST_IP:7891 https://httpbin.org/ip
```

---

## 4️⃣ 使用 12VPX VPN（全隧道型）

与 XTSL 不同，**12VPX 是全隧道 VPN**：  
- 它在 Windows 创建一个虚拟网卡（TAP/TUN）。  
- 修改系统路由表，将默认路由 (`0.0.0.0/0`) 指向 VPN 网关。  

验证方法：

```powershell
route print
```

如果默认路由被改为 12VPX 的网卡（通常是 10.x.x.x / 172.x.x.x），说明是全隧道。  

### WSL 对 12VPX 的行为：
- WSL NAT 出口 IP = Windows 出口 IP  
- 所以 WSL 会自动走 12VPX VPN 的隧道  
- 不需要在 WSL 配置 http_proxy  
- 测试：
  ```bash
  curl ifconfig.me
  ```
  IP 应该与 Windows 浏览器一致（VPN 出口 IP）。

👉 **只有当 12VPX 配置为“分流模式”时，WSL 才可能直连，需要额外代理。**

---

## 5️⃣ 常见问题排查 (FAQ)

### ❓ curl 卡住  
- 检查代理端口是否转发成功：  
  ```powershell
  netstat -ano | findstr 7890
  ```

### ❓ 返回国内 IP  
- 确认是否正确设置环境变量：  
  ```bash
  echo $http_proxy
  curl ifconfig.me
  ```

### ❓ 内网服务被代理拦截  
- 添加到 `no_proxy` 白名单，例如：  
  ```bash
  export no_proxy="localhost,127.0.0.1,.corp.local,10.0.0.0/8,192.168.0.0/16"
  ```

---

## ✅ 总结

- **XTSL China VPN** → 应用代理型，必须通过 `portproxy` 暴露到 0.0.0.0，WSL 才能访问。  
- **12VPX VPN** → 全隧道型，WSL NAT 出口自动走 VPN，无需额外设置。  
- 配置完成后，WSL 与 Windows 浏览器出口一致，可顺利访问 GitHub/Google 等外网资源。
